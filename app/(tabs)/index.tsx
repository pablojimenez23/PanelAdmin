import { useState, useMemo, useEffect } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URL } from "@/services/apiConfig";

interface Usuario {
  id: number;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

type OrdenFiltro = "az" | "za" | "reciente" | "antiguo";

function formatearFecha(isoString: string): string {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleDateString("es-CL", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function obtenerIniciales(nombre: string): string {
  return nombre.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const COLORES_AVATAR = ["#3498db","#2ecc71","#e67e22","#9b59b6","#e74c3c","#1abc9c","#f39c12"];

function colorAvatar(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return COLORES_AVATAR[Math.abs(hash) % COLORES_AVATAR.length]!;
}

const OPCIONES_ORDEN: { valor: OrdenFiltro; etiqueta: string }[] = [
  { valor: "az",       etiqueta: "A → Z"       },
  { valor: "za",       etiqueta: "Z → A"       },
  { valor: "reciente", etiqueta: "Más reciente" },
  { valor: "antiguo",  etiqueta: "Más antiguo"  },
];

export default function AdminPanel() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  const [usuarios, setUsuarios]                 = useState<Usuario[]>([]);
  const [cargando, setCargando]                 = useState(true);
  const [busqueda, setBusqueda]                 = useState("");
  const [orden, setOrden]                       = useState<OrdenFiltro>("az");
  const [filtroRol, setFiltroRol]               = useState<"todos" | "USER" | "ADMIN">("todos");
  const [modalEdicion, setModalEdicion]         = useState(false);
  const [usuarioEditando, setUsuarioEditando]   = useState<Usuario | null>(null);
  const [usernameTemp, setUsernameTemp]         = useState("");
  const [emailTemp, setEmailTemp]               = useState("");
  const [rolTemp, setRolTemp]                   = useState<"USER" | "ADMIN">("USER");
  const [guardando, setGuardando]               = useState(false);
  const [modalEliminar, setModalEliminar]       = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);
  const [eliminando, setEliminando]             = useState(false);
  const [usernameAdmin, setUsernameAdmin]       = useState("");

  // Si no hay token redirige al login, si hay decodifica el username
  useEffect(() => {
    if (!token) router.replace("/login" as any);
    else {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUsernameAdmin(payload.sub ?? "");
      } catch {}
    }
  }, [token]);

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token ?? ""}`,
  };

  // Redirige al login si el token expiró
  function manejarTokenExpirado(status: number): boolean {
    if (status === 401 || status === 403) {
      Alert.alert("Sesión cerrada", "Su sesión se ha cerrado por inactividad.", [
        { text: "Aceptar", onPress: () => router.replace("/login" as any) }
      ]);
      return true;
    }
    return false;
  }

  // Carga lista de usuarios desde el microservicio
  async function cargarUsuarios() {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, { headers });
      if (manejarTokenExpirado(res.status)) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsuarios(data.users ?? []);
    } catch {
      Alert.alert("Error", "No se pudo cargar la lista de usuarios.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (token) cargarUsuarios();
  }, [token]);

  // Filtra y ordena la lista localmente
  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let lista = [...usuarios];
    if (q) lista = lista.filter(u =>
      u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
    if (filtroRol !== "todos") lista = lista.filter(u => u.role === filtroRol);
    lista.sort((a, b) => {
      if (orden === "az")       return a.username.localeCompare(b.username, "es");
      if (orden === "za")       return b.username.localeCompare(a.username, "es");
      if (orden === "reciente") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (orden === "antiguo")  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });
    return lista;
  }, [usuarios, busqueda, orden, filtroRol]);

  const totalAdmin = usuarios.filter(u => u.role === "ADMIN").length;
  const totalUser  = usuarios.filter(u => u.role === "USER").length;

  // Abre modal de edicion con datos del usuario seleccionado
  function abrirEdicion(u: Usuario) {
    setUsuarioEditando(u);
    setUsernameTemp(u.username);
    setEmailTemp(u.email);
    setRolTemp(u.role);
    setModalEdicion(true);
  }

  function cerrarEdicion() {
    setModalEdicion(false);
    setUsuarioEditando(null);
    setUsernameTemp("");
    setEmailTemp("");
    setRolTemp("USER");
  }

  // Envia PUT al microservicio con los datos editados
  async function guardarCambios() {
    if (!usernameTemp.trim() || !emailTemp.trim() || !emailTemp.includes("@")) {
      Alert.alert("Validación", "Completa todos los campos correctamente.");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${usuarioEditando!.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          username: usernameTemp.trim(),
          email: emailTemp.trim().toLowerCase(),
          role: rolTemp,
        }),
      });
      if (manejarTokenExpirado(res.status)) return;
      if (!res.ok) throw new Error();
      await cargarUsuarios();
      cerrarEdicion();
    } catch {
      Alert.alert("Error", "No se pudo actualizar el usuario.");
    } finally {
      setGuardando(false);
    }
  }

  // Abre modal de confirmacion de eliminacion
  function abrirEliminar(u: Usuario) {
    setUsuarioAEliminar(u);
    setModalEliminar(true);
  }

  function cerrarEliminar() {
    setModalEliminar(false);
    setUsuarioAEliminar(null);
  }

  // Envia DELETE al microservicio
  async function ejecutarEliminacion() {
    setEliminando(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${usuarioAEliminar!.id}`, {
        method: "DELETE",
        headers,
      });
      if (manejarTokenExpirado(res.status)) return;
      if (!res.ok) throw new Error();
      await cargarUsuarios();
      cerrarEliminar();
    } catch {
      Alert.alert("Error", "No se pudo eliminar el usuario.");
    } finally {
      setEliminando(false);
    }
  }

  // Cierra sesion y vuelve al login
  function cerrarSesion() {
    router.replace("/login" as any);
  }

  // Tarjeta individual de usuario
  function TarjetaUsuario({ item }: { item: Usuario }) {
    const color   = colorAvatar(item.email);
    const esAdmin = item.role === "ADMIN";
    return (
      <View style={estilos.tarjeta}>
        <View style={[estilos.tarjetaBarra, { backgroundColor: color }]} />
        <View style={[estilos.avatar, { backgroundColor: color + "22" }]}>
          <Text style={[estilos.avatarTexto, { color }]}>{obtenerIniciales(item.username)}</Text>
        </View>
        <View style={estilos.tarjetaInfo}>
          <View style={estilos.nombreFila}>
            <Text style={estilos.tarjetaNombre} numberOfLines={1}>{item.username}</Text>
            <View style={[estilos.rolBadge, esAdmin ? estilos.rolBadgeAdmin : estilos.rolBadgeUser]}>
              <Text style={[estilos.rolBadgeTexto, esAdmin ? estilos.rolTextoAdmin : estilos.rolTextoUser]}>
                {item.role}
              </Text>
            </View>
          </View>
          <Text style={estilos.tarjetaCorreo} numberOfLines={1}>{item.email}</Text>
          <View style={[estilos.fechaBadge, { backgroundColor: color + "15" }]}>
            <Text style={[estilos.tarjetaFecha, { color }]}>{formatearFecha(item.createdAt)}</Text>
          </View>
        </View>
        <View style={estilos.acciones}>
          <TouchableOpacity style={estilos.botonEditar} onPress={() => abrirEdicion(item)} activeOpacity={0.8}>
            <Text style={estilos.botonEditarTexto}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.botonEliminarTarjeta} onPress={() => abrirEliminar(item)} activeOpacity={0.8}>
            <Text style={estilos.botonEliminarTarjetaTexto}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor="#3498db" />

      {/* Header con buscador y estadisticas */}
      <View style={estilos.header}>
        <View style={estilos.circulo1} />
        <View style={estilos.circulo2} />
        <View style={estilos.headerTop}>
          <View>
            <Text style={estilos.saludo}>Hola, {usernameAdmin}</Text>
            <Text style={estilos.titulo}>Gestión de usuarios</Text>
            <Text style={estilos.subtitulo}>
              {usuariosFiltrados.length} de {usuarios.length} usuarios registrados
            </Text>
          </View>
          <TouchableOpacity style={estilos.botonSalir} onPress={cerrarSesion} activeOpacity={0.8}>
            <Text style={estilos.botonSalirTexto}>Salir</Text>
          </TouchableOpacity>
        </View>
        <View style={estilos.statsRow}>
          <View style={estilos.statBox}>
            <Text style={estilos.statNum}>{totalAdmin}</Text>
            <Text style={estilos.statLabel}>Admins</Text>
          </View>
          <View style={estilos.statDivider} />
          <View style={estilos.statBox}>
            <Text style={estilos.statNum}>{totalUser}</Text>
            <Text style={estilos.statLabel}>Usuarios</Text>
          </View>
          <View style={estilos.statDivider} />
          <TouchableOpacity style={estilos.statBox} onPress={cargarUsuarios} activeOpacity={0.7}>
            <Text style={estilos.statNum}>↺</Text>
            <Text style={estilos.statLabel}>Recargar</Text>
          </TouchableOpacity>
        </View>
        <View style={estilos.inputContenedor}>
          <Text style={estilos.lupita}>🔍</Text>
          <TextInput
            style={estilos.input}
            placeholder="Buscar por nombre o correo..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda("")}>
              <Text style={estilos.limpiarTexto}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chips de filtro por rol y orden */}
      <View style={estilos.chipsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chipsContenedor} bounces={false}>
          {(["todos", "ADMIN", "USER"] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[estilos.chip, filtroRol === r && estilos.chipActivoVerde]}
              onPress={() => setFiltroRol(r)}
              activeOpacity={0.8}
            >
              <Text style={[estilos.chipTexto, filtroRol === r && estilos.chipTextoActivoVerde]}>
                {r === "todos" ? "Todos" : r}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={estilos.chipSeparador} />
          {OPCIONES_ORDEN.map((op) => (
            <TouchableOpacity
              key={op.valor}
              style={[estilos.chip, orden === op.valor && estilos.chipActivo]}
              onPress={() => setOrden(op.valor)}
              activeOpacity={0.8}
            >
              <Text style={[estilos.chipTexto, orden === op.valor && estilos.chipTextoActivo]}>
                {op.etiqueta}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de usuarios o indicador de carga */}
      {cargando ? (
        <View style={estilos.cargandoContenedor}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={estilos.cargandoTexto}>Cargando usuarios...</Text>
        </View>
      ) : (
        <FlatList
          data={usuariosFiltrados}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <TarjetaUsuario item={item} />}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Text style={estilos.vacioTexto}>
                {busqueda ? "Sin resultados para esa búsqueda." : "No hay usuarios registrados."}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal edicion de usuario */}
      <Modal visible={modalEdicion} transparent animationType="slide" onRequestClose={cerrarEdicion}>
        <KeyboardAvoidingView style={estilos.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={estilos.modalContenedor}>
            <View style={estilos.modalHandle} />
            <Text style={estilos.modalTitulo}>Editar usuario</Text>
            {usuarioEditando && (
              <View style={[estilos.modalAvatarFila, { borderLeftColor: colorAvatar(usuarioEditando.email), borderLeftWidth: 3 }]}>
                <View style={[estilos.modalAvatar, { backgroundColor: colorAvatar(usuarioEditando.email) + "22" }]}>
                  <Text style={[estilos.modalAvatarTexto, { color: colorAvatar(usuarioEditando.email) }]}>
                    {obtenerIniciales(usernameTemp || usuarioEditando.username)}
                  </Text>
                </View>
                <View>
                  <Text style={estilos.modalFechaLabel}>Cuenta creada el</Text>
                  <Text style={estilos.modalFechaValor}>{formatearFecha(usuarioEditando.createdAt)}</Text>
                </View>
              </View>
            )}
            <View style={estilos.campoContenedor}>
              <Text style={estilos.campoEtiqueta}>Nombre de usuario</Text>
              <TextInput style={estilos.campoInput} placeholder="username" placeholderTextColor="#AAAAAA" value={usernameTemp} onChangeText={setUsernameTemp} autoCapitalize="none" returnKeyType="next" />
            </View>
            <View style={estilos.campoContenedor}>
              <Text style={estilos.campoEtiqueta}>Correo electrónico</Text>
              <TextInput style={estilos.campoInput} placeholder="correo@ejemplo.com" placeholderTextColor="#AAAAAA" value={emailTemp} onChangeText={setEmailTemp} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="done" />
            </View>
            <View style={estilos.campoContenedor}>
              <Text style={estilos.campoEtiqueta}>Rol</Text>
              <View style={estilos.rolSelector}>
                <TouchableOpacity style={[estilos.rolOpcion, rolTemp === "ADMIN" && estilos.rolOpcionActivaAdmin]} onPress={() => setRolTemp("ADMIN")} activeOpacity={0.8}>
                  <Text style={[estilos.rolOpcionTexto, rolTemp === "ADMIN" && estilos.rolOpcionTextoActivo]}>ADMIN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[estilos.rolOpcion, rolTemp === "USER" && estilos.rolOpcionActivaUser]} onPress={() => setRolTemp("USER")} activeOpacity={0.8}>
                  <Text style={[estilos.rolOpcionTexto, rolTemp === "USER" && estilos.rolOpcionTextoActivo]}>USER</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={estilos.botonPrimario} onPress={guardarCambios} activeOpacity={0.85} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={estilos.botonPrimarioTexto}>Guardar cambios</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={estilos.botonSecundario} onPress={cerrarEdicion} activeOpacity={0.8}>
              <Text style={estilos.botonSecundarioTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal confirmacion de eliminacion */}
      <Modal visible={modalEliminar} transparent animationType="slide" onRequestClose={cerrarEliminar}>
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContenedor}>
            <View style={estilos.modalHandle} />
            <Text style={estilos.modalTitulo}>Eliminar usuario</Text>
            {usuarioAEliminar && (
              <Text style={estilos.eliminarSubtitulo}>
                Estás a punto de eliminar a{" "}
                <Text style={estilos.eliminarNombre}>{usuarioAEliminar.username}</Text>
                {" "}({usuarioAEliminar.role}). Esta acción no se puede deshacer.
              </Text>
            )}
            <TouchableOpacity style={estilos.botonEliminar} onPress={ejecutarEliminacion} activeOpacity={0.85} disabled={eliminando}>
              {eliminando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={estilos.botonPrimarioTexto}>Sí, eliminar usuario</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={estilos.botonSecundario} onPress={cerrarEliminar} activeOpacity={0.8}>
              <Text style={estilos.botonSecundarioTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#EEF4FB" },
  header:     { backgroundColor: "#3498db", paddingHorizontal: 24, paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", shadowColor: "#2980b9", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
  circulo1:   { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.08)", top: -50, right: -40 },
  circulo2:   { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.06)", bottom: -20, left: 20 },
  headerTop:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  saludo:     { fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: "500", marginBottom: 2 },
  titulo:     { fontSize: 24, fontWeight: "800", color: "#FFFFFF", marginBottom: 2 },
  subtitulo:  { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  botonSalir:      { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  botonSalirTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  statsRow:    { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12, marginBottom: 16 },
  statBox:     { flex: 1, alignItems: "center" },
  statNum:     { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  statLabel:   { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.3)" },

  inputContenedor: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  lupita:          { fontSize: 15, marginRight: 8 },
  input:           { flex: 1, fontSize: 14, color: "#FFFFFF" },
  limpiarTexto:    { fontSize: 14, color: "rgba(255,255,255,0.7)" },

  chipsWrapper:         { paddingVertical: 14, paddingHorizontal: 16 },
  chipsContenedor:      { gap: 8, alignItems: "center" },
  chip:                 { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#D6E8F7" },
  chipActivo:           { backgroundColor: "#3498db", borderColor: "#2980b9" },
  chipActivoVerde:      { backgroundColor: "#27ae60", borderColor: "#1e8449" },
  chipTexto:            { fontSize: 13, fontWeight: "600", color: "#3498db" },
  chipTextoActivo:      { color: "#FFFFFF" },
  chipTextoActivoVerde: { color: "#FFFFFF" },
  chipSeparador:        { width: 1, height: 28, backgroundColor: "#D6E8F7", marginHorizontal: 4 },

  cargandoContenedor: { flex: 1, alignItems: "center", justifyContent: "center" },
  cargandoTexto:      { marginTop: 12, fontSize: 14, color: "#888888" },

  lista: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },

  tarjeta:      { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, overflow: "hidden" },
  tarjetaBarra: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  avatar:       { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: 12, marginLeft: 8, flexShrink: 0 },
  avatarTexto:  { fontSize: 16, fontWeight: "800" },
  tarjetaInfo:  { flex: 1, marginRight: 10 },
  nombreFila:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" },
  tarjetaNombre:{ fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  tarjetaCorreo:{ fontSize: 12, color: "#888888", marginBottom: 6 },
  fechaBadge:   { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tarjetaFecha: { fontSize: 11, fontWeight: "600" },

  rolBadge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rolBadgeAdmin: { backgroundColor: "#EBF5FB", borderWidth: 1, borderColor: "#BEE3F8" },
  rolBadgeUser:  { backgroundColor: "#F2F3F4", borderWidth: 1, borderColor: "#D5D8DC" },
  rolBadgeTexto: { fontSize: 11, fontWeight: "700" },
  rolTextoAdmin: { color: "#2980b9" },
  rolTextoUser:  { color: "#717D7E" },

  acciones:                 { flexDirection: "column", gap: 6 },
  botonEditar:              { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#EBF5FB", borderWidth: 1, borderColor: "#BEE3F8" },
  botonEditarTexto:         { fontSize: 12, fontWeight: "700", color: "#3498db" },
  botonEliminarTarjeta:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FDEDEC", borderWidth: 1, borderColor: "#FADBD8" },
  botonEliminarTarjetaTexto:{ fontSize: 12, fontWeight: "700", color: "#e74c3c" },

  vacio:     { paddingTop: 60, alignItems: "center" },
  vacioTexto:{ fontSize: 15, color: "#AAAAAA", textAlign: "center" },

  modalOverlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalContenedor: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24 },
  modalHandle:     { width: 40, height: 4, backgroundColor: "#E0E0E0", borderRadius: 2, alignSelf: "center", marginBottom: 24 },
  modalTitulo:     { fontSize: 22, fontWeight: "700", color: "#1A1A1A", marginBottom: 16 },
  modalAvatarFila: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20, backgroundColor: "#F8F9FA", borderRadius: 12, padding: 14 },
  modalAvatar:     { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  modalAvatarTexto:{ fontSize: 16, fontWeight: "700" },
  modalFechaLabel: { fontSize: 11, color: "#AAAAAA", marginBottom: 2 },
  modalFechaValor: { fontSize: 14, color: "#1A1A1A", fontWeight: "600" },

  campoContenedor: { marginBottom: 16 },
  campoEtiqueta:   { fontSize: 13, fontWeight: "600", color: "#444444", marginBottom: 6 },
  campoInput:      { height: 48, borderWidth: 1.5, borderColor: "#E8E8E8", borderRadius: 12, paddingHorizontal: 14, fontSize: 14, color: "#1A1A1A", backgroundColor: "#F8F9FA" },

  rolSelector:          { flexDirection: "row", gap: 10 },
  rolOpcion:            { flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: "#E8E8E8", alignItems: "center", justifyContent: "center", backgroundColor: "#F8F9FA" },
  rolOpcionActivaAdmin: { backgroundColor: "#EBF5FB", borderColor: "#3498db" },
  rolOpcionActivaUser:  { backgroundColor: "#F2F3F4", borderColor: "#7F8C8D" },
  rolOpcionTexto:       { fontSize: 14, fontWeight: "600", color: "#AAAAAA" },
  rolOpcionTextoActivo: { color: "#1A1A1A" },

  eliminarSubtitulo: { fontSize: 14, color: "#666666", lineHeight: 22, marginBottom: 20 },
  eliminarNombre:    { fontWeight: "700", color: "#1A1A1A" },

  botonPrimario:       { height: 52, backgroundColor: "#3498db", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  botonPrimarioTexto:  { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  botonEliminar:       { height: 52, backgroundColor: "#e74c3c", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  botonSecundario:     { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  botonSecundarioTexto:{ fontSize: 15, fontWeight: "600", color: "#3498db" },
});