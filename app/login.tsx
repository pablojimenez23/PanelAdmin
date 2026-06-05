import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { API_URL } from "@/services/apiConfig";

const TIMEOUT_MS = 8000;

// Fetch con timeout
async function fetchConTimeout(url: string, opciones: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...opciones, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Decodifica el payload del token JWT sin librería externa
function decodificarToken(token: string): any {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const [correo, setCorreo]     = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin() {
    setError("");
    if (!correo.trim() || !password.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setCargando(true);
    try {
      const res = await fetchConTimeout(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernameOrEmail: correo.trim(), password }),
        },
        TIMEOUT_MS
      );

      const datos = await res.json();

      if (res.status === 401 || res.status === 403) {
        setError("Credenciales incorrectas. Verifica tu usuario y contraseña.");
        return;
      }
      if (res.status === 404) {
        setError("Usuario no encontrado.");
        return;
      }
      if (res.status >= 500) {
        setError("Error en el servidor. Intenta más tarde.");
        return;
      }
      if (!res.ok) {
        setError(datos.message || "Error al iniciar sesión.");
        return;
      }

      // El rol viene en el payload del JWT, no en el body de la respuesta
      const payload = decodificarToken(datos.token);
      if (!payload || payload.role !== "ADMIN") {
        setError("Acceso denegado. Solo los administradores pueden acceder.");
        return;
      }

      router.replace({ pathname: "/(tabs)", params: { token: datos.token } });

    } catch (e: any) {
      if (e?.name === "AbortError") {
        setError("Tiempo de espera agotado. Verifica tu conexión e intenta de nuevo.");
      } else {
        setError("No se pudo conectar con el servidor. Verifica tu red.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={e.contenedor} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={e.card}>
        <Text style={e.titulo}>Panel Administrador</Text>
        <Text style={e.subtitulo}>Acceso exclusivo para administradores</Text>

        <View style={e.campo}>
          <Text style={e.etiqueta}>Usuario o correo</Text>
          <TextInput
            style={[e.input, error ? e.inputError : null]}
            placeholder="admin@ejemplo.com"
            placeholderTextColor="#AAAAAA"
            value={correo}
            onChangeText={(t) => { setCorreo(t); setError(""); }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>

        <View style={e.campo}>
          <Text style={e.etiqueta}>Contraseña</Text>
          <TextInput
            style={[e.input, error ? e.inputError : null]}
            placeholder="Tu contraseña"
            placeholderTextColor="#AAAAAA"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(""); }}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
        </View>

        {error ? (
          <View style={e.errorContenedor}>
            <Text style={e.errorTexto}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={e.boton} onPress={handleLogin} activeOpacity={0.85} disabled={cargando}>
          {cargando
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={e.botonTexto}>Ingresar</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const e = StyleSheet.create({
  contenedor:      { flex: 1, backgroundColor: "#EEF4FB", justifyContent: "center", padding: 24 },
  card:            { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  titulo:          { fontSize: 22, fontWeight: "800", color: "#1A1A1A", textAlign: "center", marginBottom: 4 },
  subtitulo:       { fontSize: 13, color: "#888888", textAlign: "center", marginBottom: 24 },
  campo:           { marginBottom: 14 },
  etiqueta:        { fontSize: 13, fontWeight: "600", color: "#444444", marginBottom: 6 },
  input:           { height: 48, borderWidth: 1.5, borderColor: "#E8E8E8", borderRadius: 12, paddingHorizontal: 14, fontSize: 14, color: "#1A1A1A", backgroundColor: "#F8F9FA" },
  inputError:      { borderColor: "#e74c3c" },
  errorContenedor: { backgroundColor: "#FDEDEC", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#FADBD8" },
  errorTexto:      { fontSize: 13, color: "#e74c3c", fontWeight: "500", textAlign: "center" },
  boton:           { height: 52, backgroundColor: "#3498db", borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  botonTexto:      { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});