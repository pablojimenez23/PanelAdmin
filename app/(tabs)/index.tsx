import { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Usuario {
  nombre: string;
  correo: string;
  fechaCreacion: string;
  rol: "Admin" | "Usuario";
}

type OrdenFiltro = "az" | "za" | "reciente" | "antiguo";

const USUARIOS_INICIALES: Usuario[] = [
  { nombre: "Ana García",      correo: "ana.garcia@ejemplo.com",      fechaCreacion: "2024-01-15T10:30:00.000Z", rol: "Admin"   },
  { nombre: "Carlos Mendoza",  correo: "carlos.mendoza@ejemplo.com",  fechaCreacion: "2024-02-28T08:15:00.000Z", rol: "Usuario" },
  { nombre: "Sofía Ramírez",   correo: "sofia.ramirez@ejemplo.com",   fechaCreacion: "2024-03-10T14:45:00.000Z", rol: "Usuario" },
  { nombre: "Diego Torres",    correo: "diego.torres@ejemplo.com",    fechaCreacion: "2024-04-05T09:00:00.000Z", rol: "Admin"   },
  { nombre: "Valentina López", correo: "valentina.lopez@ejemplo.com", fechaCreacion: "2024-05-20T16:20:00.000Z", rol: "Usuario" },
  { nombre: "Martín Herrera",  correo: "martin.herrera@ejemplo.com",  fechaCreacion: "2024-06-03T11:00:00.000Z", rol: "Usuario" },
  { nombre: "Isidora Vega",    correo: "isidora.vega@ejemplo.com",    fechaCreacion: "2024-07-18T13:30:00.000Z", rol: "Admin"   },
];

function formatearFecha(isoString: string): string {
  return new Date(isoString).toLocaleDateString("es-CL", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function obtenerIniciales(nombre: string): string {
  return nombre.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const COLORES_AVATAR = ["#3498db","#2ecc71","#e67e22","#9b59b6","#e74c3c","#1abc9c","#f39c12"];

function colorAvatar(correo: string): string {
  let hash = 0;
  for (let i = 0; i < correo.length; i++) hash = correo.charCodeAt(i) + ((hash << 5) - hash);
  return COLORES_AVATAR[Math.abs(hash) % COLORES_AVATAR.length]!;
}

const OPCIONES_ORDEN: { valor: OrdenFiltro; etiqueta: string }[] = [
  { valor: "az",       etiqueta: "Nombre A → Z"         },
  { valor: "za",       etiqueta: "Nombre Z → A"         },
  { valor: "reciente", etiqueta: "Más reciente"          },
  { valor: "antiguo",  etiqueta: "Más antiguo"           },
];

export default function AdminUsuariosScreen() {
  const [usuarios, setUsuarios]                 = useState<Usuario[]>(USUARIOS_INICIALES);
  const [busqueda, setBusqueda]                 = useState("");
  const [orden, setOrden]                       = useState<OrdenFiltro>("az");
  const [filtroRol, setFiltroRol]               = useState<"todos" | "Admin" | "Usuario">("todos");
  const [modalEdicion, setModalEdicion]         = useState(false);
  const [usuarioEditando, setUsuarioEditando]   = useState<Usuario | null>(null);
  const [nombreTemp, setNombreTemp]             = useState("");
  const [correoTemp, setCorreoTemp]             = useState("");
  const [rolTemp, setRolTemp]                   = useState<"Admin" | "Usuario">("Usuario");
  const [modalEliminar, setModalEliminar]       = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);
  const [motivoEliminar, setMotivoEliminar]     = useState("");

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let lista = [...usuarios];
    if (q) lista = lista.filter(u => u.nombre.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q));
    if (filtroRol !== "todos") lista = lista.filter(u => u.rol === filtroRol);
    lista.sort((a, b) => {
      if (orden === "az")       return a.nombre.localeCompare(b.nombre, "es");
      if (orden === "za")       return b.nombre.localeCompare(a.nombre, "es");
      if (orden === "reciente") return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
      if (orden === "antiguo")  return new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime();
      return 0;
    });
    return lista;
  }, [usuarios, busqueda, orden, filtroRol]);

  const totalAdmin   = usuarios.filter(u => u.rol === "Admin").length;
  const totalUsuario = usuarios.filter(u => u.rol === "Usuario").length;

  function abrirEdicion(usuario: Usuario) {
    setUsuarioEditando(usuario);
    setNombreTemp(usuario.nombre);
    setCorreoTemp(usuario.correo);
    setRolTemp(usuario.rol);
    setModalEdicion(true);
  }

  function cerrarEdicion() {
    setModalEdicion(false);
    setUsuarioEditando(null);
    setNombreTemp("");
    setCorreoTemp("");
    setRolTemp("Usuario");
  }

  function guardarCambios() {
    if (!nombreTemp.trim() || !correoTemp.trim() || !correoTemp.includes("@")) return;
    setUsuarios(prev => prev.map(u =>
      u.correo === usuarioEditando?.correo
        ? { ...u, nombre: nombreTemp.trim(), correo: correoTemp.trim().toLowerCase(), rol: rolTemp }
        : u
    ));
    cerrarEdicion();
  }

  function abrirEliminar(usuario: Usuario) {
    setUsuarioAEliminar(usuario);
    setMotivoEliminar("");
    setModalEliminar(true);
  }

  function cerrarEliminar() {
    setModalEliminar(false);
    setUsuarioAEliminar(null);
    setMotivoEliminar("");
  }

  function ejecutarEliminacion() {
    setUsuarios(prev => prev.filter(u => u.correo !== usuarioAEliminar?.correo));
    cerrarEliminar();
  }

  function TarjetaUsuario({ item }: { item: Usuario }) {
    const color   = colorAvatar(item.correo);
    const esAdmin = item.rol === "Admin";
    return (
      <View style={estilos.tarjeta}>
        <View style={[estilos.tarjetaBarra, { backgroundColor: color }]} />
        <View style={[estilos.avatar, { backgroundColor: color + "22" }]}>
          <Text style={[estilos.avatarTexto, { color }]}>{obtenerIniciales(item.nombre)}</Text>
        </View>
        <View style={estilos.tarjetaInfo}>
          <View style={estilos.nombreFila}>
            <Text style={estilos.tarjetaNombre} numberOfLines={1}>{item.nombre}</Text>
            <View style={[estilos.rolBadge, esAdmin ? estilos.rolBadgeAdmin : estilos.rolBadgeUsuario]}>
              <Text style={[estilos.rolBadgeTexto, esAdmin ? estilos.rolBadgeTextoAdmin : estilos.rolBadgeTextoUsuario]}>
                {item.rol}
              </Text>
            </View>
          </View>
          <Text style={estilos.tarjetaCorreo} numberOfLines={1}>{item.correo}</Text>
          <View style={[estilos.fechaBadge, { backgroundColor: color + "15" }]}>
            <Text style={[estilos.tarjetaFecha, { color }]}>{formatearFecha(item.fechaCreacion)}</Text>
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

      {/* ── Header ── */}
      <View style={estilos.header}>
        <View style={estilos.circulo1} />
        <View style={estilos.circulo2} />
        <Text style={estilos.titulo}>Gestión de usuarios</Text>
        <Text style={estilos.subtitulo}>
          {usuariosFiltrados.length} de {usuarios.length} usuarios registrados
        </Text>

        {/* Estadísticas de roles */}
        <View style={estilos.statsRow}>
          <View style={estilos.statBox}>
            <Text style={estilos.statNum}>{totalAdmin}</Text>
            <Text style={estilos.statLabel}>Admins</Text>
          </View>
          <View style={estilos.statDivider} />
          <View style={estilos.statBox}>
            <Text style={estilos.statNum}>{totalUsuario}</Text>
            <Text style={estilos.statLabel}>Usuarios</Text>
          </View>
        </View>

        {/* Buscador */}
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

      {/* ── Chips filtro rol + orden ── */}
      <View style={estilos.chipsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chipsContenedor} bounces={false}>
          {/* Filtro por rol */}
          {(["todos", "Admin", "Usuario"] as const).map((r) => (
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

          {/* Orden */}
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

      {/* ── Lista ── */}
      <FlatList
        data={usuariosFiltrados}
        keyExtractor={(item) => item.correo}
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

      {/* ══ Modal — Editar ══ */}
      <Modal visible={modalEdicion} transparent animationType="slide" onRequestClose={cerrarEdicion}>
        <KeyboardAvoidingView style={estilos.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={estilos.modalContenedor}>
            <View style={estilos.modalHandle} />
            <Text style={estilos.modalTitulo}>Editar usuario</Text>

            {usuarioEditando && (
              <View style={[estilos.modalAvatarFila, { borderLeftColor: colorAvatar(usuarioEditando.correo), borderLeftWidth: 3 }]}>
                <View style={[estilos.modalAvatar, { backgroundColor: colorAvatar(usuarioEditando.correo) + "22" }]}>
                  <Text style={[estilos.modalAvatarTexto, { color: colorAvatar(usuarioEditando.correo) }]}>
                    {obtenerIniciales(nombreTemp || usuarioEditando.nombre)}
                  </Text>
                </View>
                <View>
                  <Text style={estilos.modalFechaLabel}>Cuenta creada el</Text>
                  <Text style={estilos.modalFechaValor}>{formatearFecha(usuarioEditando.fechaCreacion)}</Text>
                </View>
              </View>
            )}

            <View style={estilos.campoContenedor}>
              <Text style={estilos.campoEtiqueta}>Nombre completo</Text>
              <TextInput
                style={estilos.campoInput}
                placeholder="Nombre del usuario"
                placeholderTextColor="#AAAAAA"
                value={nombreTemp}
                onChangeText={setNombreTemp}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={estilos.campoContenedor}>
              <Text style={estilos.campoEtiqueta}>Correo electrónico</Text>
              <TextInput
                style={estilos.campoInput}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#AAAAAA"
                value={correoTemp}
                onChangeText={setCorreoTemp}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
            </View>

            {/* Selector de rol */}
            <View style={estilos.campoContenedor}>
              <Text style={estilos.campoEtiqueta}>Rol del usuario</Text>
              <View style={estilos.rolSelector}>
                <TouchableOpacity
                  style={[estilos.rolOpcion, rolTemp === "Admin" && estilos.rolOpcionActivaAdmin]}
                  onPress={() => setRolTemp("Admin")}
                  activeOpacity={0.8}
                >
                  <Text style={[estilos.rolOpcionTexto, rolTemp === "Admin" && estilos.rolOpcionTextoActivo]}>
                    👑 Admin
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[estilos.rolOpcion, rolTemp === "Usuario" && estilos.rolOpcionActivaUsuario]}
                  onPress={() => setRolTemp("Usuario")}
                  activeOpacity={0.8}
                >
                  <Text style={[estilos.rolOpcionTexto, rolTemp === "Usuario" && estilos.rolOpcionTextoActivo]}>
                    👤 Usuario
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={estilos.botonPrimario} onPress={guardarCambios} activeOpacity={0.85}>
              <Text style={estilos.botonPrimarioTexto}>Guardar cambios</Text>
            </TouchableOpacity>
            <TouchableOpacity style={estilos.botonSecundario} onPress={cerrarEdicion} activeOpacity={0.8}>
              <Text style={estilos.botonSecundarioTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ Modal — Eliminar ══ */}
      <Modal visible={modalEliminar} transparent animationType="slide" onRequestClose={cerrarEliminar}>
        <KeyboardAvoidingView style={estilos.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={estilos.modalContenedor}>
            <View style={estilos.modalHandle} />
            <View style={estilos.eliminarIconoBg}>
              <Text style={estilos.eliminarIcono}>🗑️</Text>
            </View>
            <Text style={estilos.modalTitulo}>Eliminar usuario</Text>
            {usuarioAEliminar && (
              <Text style={estilos.eliminarSubtitulo}>
                Estás a punto de eliminar a{" "}
                <Text style={estilos.eliminarNombre}>{usuarioAEliminar.nombre}</Text>
                {" "}({usuarioAEliminar.rol}). Esta acción no se puede deshacer.
              </Text>
            )}
            <View style={estilos.campoContenedor}>
              <Text style={estilos.campoEtiqueta}>
                Motivo{"  "}<Text style={estilos.motivoOpcional}>(opcional)</Text>
              </Text>
              <TextInput
                style={[estilos.campoInput, estilos.motivoInput]}
                placeholder="Ej: cuenta duplicada, solicitud del usuario..."
                placeholderTextColor="#AAAAAA"
                value={motivoEliminar}
                onChangeText={setMotivoEliminar}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity style={estilos.botonEliminar} onPress={ejecutarEliminacion} activeOpacity={0.85}>
              <Text style={estilos.botonPrimarioTexto}>Sí, eliminar usuario</Text>
            </TouchableOpacity>
            <TouchableOpacity style={estilos.botonSecundario} onPress={cerrarEliminar} activeOpacity={0.8}>
              <Text style={estilos.botonSecundarioTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#EEF4FB" },
  header: {
    backgroundColor: "#3498db",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  circulo1: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.08)", top: -50, right: -40 },
  circulo2: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.06)", bottom: -20, left: 20 },
  titulo:   { fontSize: 26, fontWeight: "800", color: "#FFFFFF", marginBottom: 4 },
  subtitulo:{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 14, fontWeight: "500" },

  statsRow:    { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12, marginBottom: 16 },
  statBox:     { flex: 1, alignItems: "center" },
  statNum:     { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  statLabel:   { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.3)" },

  inputContenedor: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  lupita:      { fontSize: 15, marginRight: 8 },
  input:       { flex: 1, fontSize: 14, color: "#FFFFFF" },
  limpiarTexto:{ fontSize: 14, color: "rgba(255,255,255,0.7)" },

  chipsWrapper:    { paddingVertical: 14, paddingHorizontal: 16 },
  chipsContenedor: { gap: 8, alignItems: "center" },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#D6E8F7" },
  chipActivo:      { backgroundColor: "#3498db", borderColor: "#2980b9" },
  chipActivoVerde: { backgroundColor: "#27ae60", borderColor: "#1e8449" },
  chipTexto:            { fontSize: 13, fontWeight: "600", color: "#3498db" },
  chipTextoActivo:      { color: "#FFFFFF" },
  chipTextoActivoVerde: { color: "#FFFFFF" },
  chipSeparador:   { width: 1, height: 28, backgroundColor: "#D6E8F7", marginHorizontal: 4 },

  lista: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },

  tarjeta: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, overflow: "hidden" },
  tarjetaBarra: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  avatar:      { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: 12, marginLeft: 8, flexShrink: 0 },
  avatarTexto: { fontSize: 16, fontWeight: "800" },
  tarjetaInfo: { flex: 1, marginRight: 10 },
  nombreFila:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" },
  tarjetaNombre:  { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  tarjetaCorreo:  { fontSize: 12, color: "#888888", marginBottom: 6 },
  fechaBadge:     { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tarjetaFecha:   { fontSize: 11, fontWeight: "600" },

  rolBadge:            { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rolBadgeAdmin:       { backgroundColor: "#EBF5FB", borderWidth: 1, borderColor: "#BEE3F8" },
  rolBadgeUsuario:     { backgroundColor: "#F2F3F4", borderWidth: 1, borderColor: "#D5D8DC" },
  rolBadgeTexto:       { fontSize: 11, fontWeight: "700" },
  rolBadgeTextoAdmin:  { color: "#2980b9" },
  rolBadgeTextoUsuario:{ color: "#717D7E" },

  acciones:              { flexDirection: "column", gap: 6 },
  botonEditar:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#EBF5FB", borderWidth: 1, borderColor: "#BEE3F8" },
  botonEditarTexto:      { fontSize: 12, fontWeight: "700", color: "#3498db" },
  botonEliminarTarjeta:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FDEDEC", borderWidth: 1, borderColor: "#FADBD8" },
  botonEliminarTarjetaTexto: { fontSize: 12, fontWeight: "700", color: "#e74c3c" },

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
  rolOpcionActivaUsuario:{ backgroundColor: "#F2F3F4", borderColor: "#7F8C8D" },
  rolOpcionTexto:       { fontSize: 14, fontWeight: "600", color: "#AAAAAA" },
  rolOpcionTextoActivo: { color: "#1A1A1A" },

  eliminarIconoBg:  { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FDEDEC", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 },
  eliminarIcono:    { fontSize: 28 },
  eliminarSubtitulo:{ fontSize: 14, color: "#666666", lineHeight: 22, marginBottom: 20 },
  eliminarNombre:   { fontWeight: "700", color: "#1A1A1A" },
  motivoOpcional:   { fontSize: 12, fontWeight: "400", color: "#AAAAAA" },
  motivoInput:      { height: undefined, minHeight: 80, paddingTop: 12 },

  botonPrimario:      { height: 52, backgroundColor: "#3498db", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  botonPrimarioTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  botonEliminar:      { height: 52, backgroundColor: "#e74c3c", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  botonSecundario:    { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  botonSecundarioTexto:{ fontSize: 15, fontWeight: "600", color: "#3498db" },
});