<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase';
import { Preferences } from '@capacitor/preferences';
import { NativeBiometric } from '@capgo/capacitor-native-biometric'; 
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useServiceStore } from '../stores/services';

// Importaciones de componentes de PrimeVue
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';


const email = ref('');
const password = ref('');
const showBiometricButton = ref(false);
const isAuthenticating = ref(false);
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const serviceStore = useServiceStore();

// Función para manejar el inicio de sesión/autenticación exitoso
const handleSuccessfulAuth = async (session: any) => {
   
    try {
        await serviceStore.fetchUser();
        const userProfile = serviceStore.userProfile;
        if (userProfile) {
            if (userProfile.role === 'admin') {
                router.push('/dashboard/admin/');
            } else if (userProfile.role === 'user') {
                router.push('/dashboard/user/');
            } else {
                router.push('/');
            }
        } else {
            router.push('/');
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar el perfil de usuario.', life: 3000 });
        router.push('/');
    } finally {
    }
};

// Función para manejar el envío del formulario de inicio de sesión
const handleSubmit = async () => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.value,
            password: password.value,
        });

        if (error) {
            toast.add({ severity: 'error', summary: 'Error de Autenticación', detail: error.message, life: 3000 });
            return;
        }

        confirm.require({
            message: '¿Deseas guardar tus credenciales para iniciar sesión con biometría en el futuro?',
            header: 'Habilitar Biometría',
            icon: 'pi pi-lock',
            acceptLabel: 'Sí',
            rejectLabel: 'No',
            accept: async () => {
                try {
                    // Guardar email y password encriptados con NativeBiometric.setCredentials
                    await NativeBiometric.setCredentials({
                        username: email.value,
                        password: password.value,
                        server: 'supabase.auth', // Un identificador para tus credenciales
                    });
                    toast.add({ severity: 'success', summary: 'Biometría Habilitada', detail: 'Credenciales guardadas para inicio de sesión biométrico.', life: 3000 });
                } catch (biometricError: any) {
                    toast.add({ severity: 'warn', summary: 'Advertencia', detail: `No se pudo guardar la sesión para biometría: ${biometricError.message}`, life: 3000 });
                }
            },
            reject: () => {
                toast.add({ severity: 'info', summary: 'Biometría Deshabilitada', detail: 'Credenciales no guardadas para biometría.', life: 3000 });
            }
        });

        await handleSuccessfulAuth(data.session);

    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error inesperado.', life: 3000 });
    }
};
// Función para autenticación biométrica
const authenticateWithBiometrics = async () => {
    isAuthenticating.value = true;
    try {
        // 1. Usar isAvailable del nuevo plugin para verificar si la biometría está disponible
        const checkResult = await NativeBiometric.isAvailable();

        if (!checkResult.isAvailable) {
            toast.add({ severity: 'warn', summary: 'Biometría', detail: 'La biometría no está disponible o configurada en este dispositivo.', life: 3000 });
            return;
        }

        // 2. Primero, verificar la identidad del usuario con biometría (esto muestra el prompt)
        try {
            await NativeBiometric.verifyIdentity({
                reason: 'Autentíquese para cargar sus credenciales de acceso', 
                title: 'Acceso Biométrico', 
                subtitle: 'Use su huella o rostro', 
                description: 'Necesario para iniciar sesión de forma segura.', 
            });
        } catch (biometricError: any) {
            toast.add({ severity: 'error', summary: 'Error Biométrico', detail: `Fallo en la autenticación: ${biometricError.message}`, life: 3000 });
            return; 
        }

        // 3. Si la identidad fue verificada, obtener las credenciales guardadas
        let credentials;
        try {
            credentials = await NativeBiometric.getCredentials({
                server: 'supabase.auth', 
            });
        } catch (credentialsError: any) {
            toast.add({ severity: 'error', summary: 'Error', detail: `No se pudieron recuperar las credenciales: ${credentialsError.message}`, life: 3000 });
            return;
        }

        if (!credentials || !credentials.username || !credentials.password) {
            toast.add({ severity: 'info', summary: 'Información', detail: 'No hay credenciales biométricas guardadas o la autenticación fue cancelada.', life: 3000 });
            return;
        }

        // 4. Usar las credenciales descifradas para un nuevo signInWithPassword
        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.username,
            password: credentials.password,
        });

        if (error) {
            toast.add({ severity: 'error', summary: 'Error de Autenticación', detail: `No se pudo iniciar sesión con biometría: ${error.message}. Por favor, inicie sesión manualmente.`, life: 5000 });
            return;
        } else if (data.session) {
            await handleSuccessfulAuth(data.session);
        } else {
            toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'No se pudo iniciar sesión biométrica.', life: 3000 });
        }

    } catch (error: any) {
        const errorMessage = error.message || 'Ocurrió un error inesperado con la biometría.';
        toast.add({ severity: 'error', summary: 'Error Biométrico', detail: errorMessage, life: 3000 });
    }
};





onMounted(async () => {
    try {
        const checkResult = await NativeBiometric.isAvailable(); // <-- ¡USANDO NativeBiometric!
        if (checkResult.isAvailable) {
            showBiometricButton.value = true;
            // --- Lógica para la animación inicial ---
           
                isAuthenticating.value = true; 
                
                setTimeout(() => {
                    isAuthenticating.value = false;
                }, 2000);
              
        } else {
            showBiometricButton.value = false;
        }
    } catch (error) {
        showBiometricButton.value = false;
        toast.add({ severity: 'error', summary: 'Error de Inicio', detail: 'No se pudo verificar la biometría.', life: 3000 });
    }
});

</script>

<template>
    <Toast />
    <ConfirmDialog></ConfirmDialog>
    <div class="login-container">
        <div class="login-card">
            <h2 class="login-title">Iniciar Sesión</h2>
            <form @submit.prevent="handleSubmit">
                <div class="p-field">
                    <label for="email">Correo Electrónico</label>
                    <InputText id="email" type="email" v-model="email" required />
                </div>
                <div class="p-field">
                    <label for="password">Contraseña</label>
                    <InputText id="password" type="password" v-model="password" required />
                </div>
                <Button type="submit" label="Iniciar Sesión" class="p-mt-3" />
            </form>
             <div v-if="showBiometricButton" class="p-mt-3">
                <Button 
                    @click="authenticateWithBiometrics()" 
                    class="p-button-secondary p-button-outlined p-button-lg biometric-icon-button" 
                    aria-label="Ingresar con Huella" 
                    :disabled="isAuthenticating" 
                >
                    <span 
                        :class="['p-button-icon', 'pi', 'pi-slack', {'pi-spin': isAuthenticating}]" 
                        data-pc-section="icon"
                    ></span>
                    
                    <span class="p-button-label" data-pc-section="label">&nbsp;</span> 
                </Button>
                <p class="biometric-text">Ingresar con Huella</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: rgb(8, 48, 61); 
}

.login-card {
    background: #f2fffd;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
    text-align: center;
}

.login-title {
    margin-bottom: 1.5rem;
    color: #333;
}

.p-field {
    margin-bottom: 1rem;
    text-align: left;
}

.p-field label {
    display: block;
    margin-bottom: 0.5rem;
    color: #555;
}

.p-inputtext {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 5px;
    box-sizing: border-box; /* Ensures padding does not increase total width */
}

.p-mt-3 {
    margin-top: 1.5rem;
}

.p-button {
    width: 100%;
    padding: 0.75rem;
    font-size: 2rem;
    border-radius: 5px;
}

/* Estilos generales para p-button-secondary*/
.p-button-secondary {
    background-color: #6c757d;
    border-color: #6c757d;
    color: rgb(7, 152, 172); /* Corregido de 'rgb(7, 152, 172)b3' a un valor RGB válido */
}

.p-button-secondary:hover {
    background-color: #5a6268;
    border-color: #545b62;
}

/* Contenedor del botón y texto */
.biometric-button-container {
    display: flex;
    flex-direction: column; /* Organiza los elementos en columna */
    align-items: center; /* Centra horizontalmente */
    gap: 10px; /* Espacio entre el botón y el texto */
    margin-top: 1.5rem; /* Margen superior como p-mt-3 */
}

/* Estilos para el texto "Ingresar con Huella" */
.biometric-text {
    font-size: 0.9rem; /* Tamaño de fuente más pequeño */
    color: #555; /* Color de texto más suave */
    margin-top: 0; /* Elimina el margen superior predeterminado del p */
    text-align: center;
}

/* ESTILOS PARA EL BOTÓN DE ICONO DE BIOMETRÍA */
.biometric-icon-button {
    width: 80px; /* Ancho fijo para el cuadro */
    height: 80px; /* Alto fijo para el cuadro */
    border-radius: 10px; /* Bordes redondeados */
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto; /* Centrar el botón */
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15); /* Sombra sutil para el botón */
    transition: all 0.3s ease-in-out; /* Transición suave al pasar el ratón */
    
    /* COLORES POR DEFECTO: GRIS OSCURO */
    background-color: #6c757d; /* Fondo gris oscuro */
    border: 2px solid #6c757d; /* Borde gris oscuro */
    color: white; /* Color del icono por defecto (BLANCO) */
}

.biometric-icon-button:hover {
    transform: translateY(-2px); /* Pequeño efecto de elevación al pasar el ratón */
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
    
    /* COLORES AL HOVER: BLANCO / CIAN */
    background-color: white; /* Fondo blanco al pasar el ratón */
    border-color: #00bcd4; /* Borde cian al pasar el ratón */
    color: #00bcd4; /* Color del icono cian al pasar el ratón */
}

/* Estilos para el icono de Slack dentro del botón */
.biometric-icon-button .pi {
    font-size: 3.5rem; /* Tamaño del icono */
    color: #cffffb; /* Hereda el color del .biometric-icon-button (blanco por defecto, cian al hover) */
    text-shadow: 0 0 8px rgba(96, 195, 194, 0.7), /* Destello blanco por defecto */
                 0 0 15px rgba(12, 251, 165, 0.5); 
    transition: all 0.3s ease-in-out;
}

.biometric-icon-button:hover .pi {
    color: inherit; /* Hereda el color cian del .biometric-icon-button:hover */
    text-shadow: 0 0 10px rgba(0, 188, 212, 0.9), /* Destello cian al hover */
                 0 0 20px rgba(0, 188, 212, 0.7);
}

/* Ajustes para el botón secundario de PrimeVue cuando es outlined y es el botón biométrico */

.p-button-secondary.p-button-outlined.biometric-icon-button {
    background-color: #217170; /* Fuerza el fondo gris, anulando 'transparent' de outlined */
    border: 2px solid #3f6b93; /* Borde gris oscuro */
    color: white; /* Color del icono por defecto (BLANCO) */
}

.p-button-secondary.p-button-outlined.biometric-icon-button:hover {
    background-color: white; /* Fondo blanco */
    border-color: #00bcd4; /* Borde cian */
    color: #00bcd4; /* Color del icono */
}

/* DEFINICIÓN DE LA ANIMACIÓN PERSONALIZADA */
@keyframes custom-spinner-animation {
    0% { transform: rotate(0deg); }
    25% { transform: rotate(180deg); } 
    50% { transform: rotate(0deg); }   
    75% { transform: rotate(-180deg); } 
    100% { transform: rotate(0deg); }    
}

/* Aplicación de la animación al icono cuando la autenticación está activa */
.biometric-custom-spin {
    animation: custom-spinner-animation 2s ease-in-out forwards; 
    animation-iteration-count: 2; 
}

/* Media queries para responsividad */
@media (max-width: 768px) {
    .login-card {
        padding: 1.5rem;
        margin: 0 15px;
    }

    .login-card h2 {
        font-size: 1.5rem;
    }

    .p-button {
        padding: 0.75rem 0.8rem;
        font-size: 1rem;
    }

    .biometric-icon-button {
        width: 70px; 
        height: 70px; 
    }

    .biometric-icon-button .pi {
        font-size: 3rem !important; 
    }
}
</style>