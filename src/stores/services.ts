// src/stores/services.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Service, NewServiceInput, ServiceImage, UserProfile } from '@/types/Service';
import { supabase } from '../supabase.js';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import * as Papa from 'papaparse';
import { Preferences } from '@capacitor/preferences';

export const useServiceStore = defineStore('services', () => {
  const toast = useToast();
  const router = useRouter();

  // --- ESTADO ---
  const services = ref<Service[]>([]);
  const userDisplayName = ref('Cargando...');
  const currentUserId = ref<string | null>(null);
  const isAddingClient = ref(false);
  const showServiceTable = ref(true);
  const isSidebarCollapsed = ref(true);
  const highlightedServiceId = ref<number | null>(null);
  const userRole = ref<string | null>(null);
  const userProfile = ref<{ username: string | null; role: string | null } | null>(null);
  const allUserProfiles = ref<UserProfile[]>([]); 
  const newServiceFormData = ref<NewServiceInput>({
    name: '',
    username: '',
    purchase_date: new Date(),
    expiration_date: new Date(),
    phone: '',
    server: '',
    device: [],
    deviceCounts: {},
    payment_method: '',
    amount: 0,
    note: null,
    owner_id: ''
  });
  
  const isShowingServiceInfo = ref(false);
  const currentServiceForInfo = ref<Service | null>(null);
  const isExporting = ref(false);
  const isImporting = ref(false);
  const serverOptions = ref([
    { label: 'Premium', value: 'Premium' },
    { label: 'Zona', value: 'Zona' },
    { label: 'Otro(Nota)', value: 'Otro (Nota)' }
  ]);
  const paymentMethodOptions = ref([
    { label: 'PayPal', value: 'PayPal' },
    { label: 'Remitly', value: 'Remitly' },
    { label: 'Ria', value: 'Ria' },
    { label: 'W.U.', value: 'W.U.' },
    { label: 'Bancolombia', value: 'Bancolombia' },
    { label: 'Otro(nota)', value: 'Otro(nota)' }
  ]);
  const deviceOptions = ref([
    'AndroidTV', 'Samsung', 'LG', 'FireTV', 'RokuTV', 'iOS', 'Android'
  ]);

  // --- ACCIONES (MÉTODOS) ---
  const resetNewServiceFormData = () => {
    newServiceFormData.value = {
        name: '',
        username: '',
        purchase_date: new Date(),
        expiration_date: new Date(),
        phone: '',
        server: '',
        device: [],
        deviceCounts: initialDeviceCounts(),
        payment_method: '',
        amount: 0,
        note: null,
        owner_id: currentUserId.value || ''
    };
    highlightedServiceId.value = null;
};

  const initialDeviceCounts = (): { [key: string]: number } => {
    const counts: { [key: string]: number } = {};
    deviceOptions.value.forEach(device => {
      counts[device] = 0;
    });
    return counts;
  };

  const parseDeviceArrayToCounts = (deviceArray: string[] | null): { [key: string]: number } => {
    const counts: { [key: string]: number } = {};
    if (deviceArray) {
      deviceArray.forEach(item => {
        const match = item.match(/^(.*?)\s*\((\d+)\)$/);
        if (match) {
          const name = match[1];
          const count = parseInt(match[2], 10);
          counts[name] = count;
        } else {
          counts[item] = (counts[item] || 0) + 1;
        }
      });
    }
    return counts;
  };

  const formatDeviceCountsToArray = (deviceCounts: { [key: string]: number } | undefined): string[] => {
    const deviceArray: string[] = [];
    if (deviceCounts) {
      for (const device in deviceCounts) {
        if (Object.prototype.hasOwnProperty.call(deviceCounts, device)) {
          if (deviceCounts[device] > 0) {
            deviceArray.push(`${device} (${deviceCounts[device]})`);
          }
        }
      }
    }
    return deviceArray;
  };

  const fetchUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Error al obtener usuario:', error.message);
        currentUserId.value = null;
        userDisplayName.value = 'Invitado';
        userProfile.value = null;
        userRole.value = null;
        allUserProfiles.value = [];
        router.push('/login');
        return;
      }

      if (user) {
        currentUserId.value = user.id;

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('ServiceStore: Error al cargar el perfil:', profileError.message);
          userProfile.value = {
            username: user.email ?? null,
            role: 'user'
          };
          userDisplayName.value = user.email || 'Usuario';
          userRole.value = 'user';
          allUserProfiles.value = []; 
          toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'No se pudo cargar la información del perfil completo.', life: 3000 });
        } else {
          userProfile.value = {
            username: profileData.username ?? null,
            role: profileData.role ?? null
          };
          userDisplayName.value = userProfile.value.username || user.email || 'Usuario';
          userRole.value = userProfile.value.role;

          // Lógica para cargar todos los perfiles si el usuario es admin
          if (userRole.value === 'admin') {
            const { data: allProfiles, error: allProfilesError } = await supabase
              .from('profiles')
              .select('id, username, role');
            if (allProfilesError) {
              allUserProfiles.value = [];
            } else {
              allUserProfiles.value = allProfiles as UserProfile[];
            }
          } else {
            allUserProfiles.value = []; 
          }
        }

      } else {
        currentUserId.value = null;
        userDisplayName.value = 'Invitado';
        userProfile.value = null;
        userRole.value = null;
        allUserProfiles.value = []; 
        router.push('/login');
      }
    } catch (err: any) {
      console.error('Excepción en fetchUser:', err.message);
      currentUserId.value = null;
      userDisplayName.value = 'Invitado';
      userProfile.value = null;
      userRole.value = null;
      allUserProfiles.value = []; 
      router.push('/login');
    }
  };

  const fetchServices = async () => {
    if (!currentUserId.value) {
      services.value = [];
      return;
    }

    try {
      let query = supabase.from('services').select('*');
      if (userRole.value !== 'admin') {
        query = query.eq('owner_id', currentUserId.value);
      }
      query = query.order('id', { ascending: false });

      const { data, error } = await query;

      if (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los servicios.', life: 3000 });
        return;
      }
      if (!data) {
        services.value = [];
        return;
      }

      services.value = (data || []).map(item => ({
        ...item,
        purchase_date: new Date(item.purchase_date),
        expiration_date: new Date(item.expiration_date),
        device: Array.isArray(item.device) ? item.device : [],
        deviceCounts: parseDeviceArrayToCounts(Array.isArray(item.device) ? item.device : null),
        owner_id: item.owner_id,
        note: item.note || null,
      })) as Service[];

      if (services.value.length > 0) {
      }
    } catch (err: any) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al cargar los servicios.', life: 3000 });
    }
  };

  const saveNewService = async (serviceData: NewServiceInput) => {
    if (!currentUserId.value) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Debes iniciar sesión para añadir servicios.', life: 3000 });
      return false;
    }

    try {
     const { images, deviceCounts, ...restOfServiceData } = serviceData;

     const serviceToInsert = {
       ...restOfServiceData,
       owner_id: currentUserId.value,
       purchase_date: restOfServiceData.purchase_date ? (restOfServiceData.purchase_date instanceof Date ? restOfServiceData.purchase_date.toISOString().split('T')[0] : restOfServiceData.purchase_date) : null,
       expiration_date: restOfServiceData.expiration_date ? (restOfServiceData.expiration_date instanceof Date ? restOfServiceData.expiration_date.toISOString().split('T')[0] : restOfServiceData.expiration_date) : null,
       device: formatDeviceCountsToArray(deviceCounts),
       note: restOfServiceData.note === '' ? null : restOfServiceData.note,
     };

      const { data, error } = await supabase
        .from('services')
        .insert([serviceToInsert])
        .select();

      if (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al añadir servicio: ${error.message}`, life: 5000 });
        return false;
      }

      if (data && data.length > 0) {
        const newService = {
          ...data[0],
          purchase_date: new Date(data[0].purchase_date),
          expiration_date: new Date(data[0].expiration_date),
          device: Array.isArray(data[0].device) ? data[0].device : [],
          deviceCounts: parseDeviceArrayToCounts(Array.isArray(data[0].device) ? data[0].device : null),
          owner_id: data[0].owner_id,
          note: data[0].note || null,
        } as Service;
        services.value.unshift(newService);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Servicio añadido correctamente.', life: 3000 });
        return true;
      } else {
        toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'Servicio añadido, pero no se recuperaron los datos inmediatamente.', life: 3000 });
        await fetchServices();
        return true;
      }
    } catch (err: any) {
      toast.add({ severity: 'error', summary: 'Error', detail: `Ocurrió un error: ${err.message}`, life: 5000 });
      return false;
    }
  };

  const updateService = async (updatedService: Partial<Service>) => {
    if (!updatedService.id) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'ID de servicio no proporcionado para actualizar.', life: 3000 });
      return false;
    }
    if (!currentUserId.value) {
      toast.add({ severity: 'error', summary: 'Error de Autorización', detail: 'No hay usuario autenticado.', life: 3000 });
      return false;
    }

    const originalService = services.value.find(s => s.id === updatedService.id);
    if (!originalService) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Servicio original no encontrado para actualizar.', life: 3000 });
      return false;
    }

    if (originalService.owner_id !== currentUserId.value && userRole.value !== 'admin') {
      toast.add({ severity: 'error', summary: 'Error de Autorización', detail: 'No tienes permiso para editar este servicio.', life: 3000 });
      return false;
    }

    const purchaseDateForDB = (updatedService.purchase_date instanceof Date
        ? updatedService.purchase_date
        : new Date(originalService.purchase_date)
    ).toISOString().split('T')[0];

    const expirationDateForDB = (updatedService.expiration_date instanceof Date
        ? updatedService.expiration_date
        : new Date(originalService.expiration_date)
    ).toISOString().split('T')[0];

    const serviceToUpdate: any = {
      name: updatedService.name || originalService.name,
      username: updatedService.username || originalService.username,
      purchase_date: purchaseDateForDB,
      expiration_date: expirationDateForDB,
      phone: updatedService.phone || originalService.phone,
      server: updatedService.server || originalService.server,
      payment_method: updatedService.payment_method || originalService.payment_method,
      amount: updatedService.amount || originalService.amount,
      owner_id: originalService.owner_id, 

      note: typeof updatedService.note !== 'undefined' ? updatedService.note : originalService.note,
      device: typeof updatedService.deviceCounts !== 'undefined' ? formatDeviceCountsToArray(updatedService.deviceCounts) : originalService.device,
    };

    if (userRole.value === 'admin' && updatedService.owner_id !== undefined) {
      serviceToUpdate.owner_id = updatedService.owner_id;
    }

    if (serviceToUpdate.note === '') {
        serviceToUpdate.note = null;
    }

    try {
      const { data, error } = await supabase
        .from('services')
        .update(serviceToUpdate)
        .eq('id', updatedService.id)
        .select();

      if (error) throw error;
      const index = services.value.findIndex(s => s.id === updatedService.id);
      if (index !== -1) {
        services.value[index] = {
          ...data[0],
          purchase_date: new Date(data[0].purchase_date),
          expiration_date: new Date(data[0].expiration_date),
          device: Array.isArray(data[0].device) ? data[0].device : (data[0].device ? JSON.parse(data[0].device) : []),
          note: data[0].note || null,
          owner_id: data[0].owner_id,
        };
      }
      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Servicio actualizado correctamente.', life: 3000 });
      return true;
    } catch (error: any) {
      toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
      return false;
    }
  };

  const deleteService = async (serviceId: number) => {
    if (!currentUserId.value) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Debes iniciar sesión para eliminar servicios.', life: 3000 });
      return false;
    }

    try {
      let query = supabase.from('services').delete().eq('id', serviceId);

      if (userRole.value !== 'admin') {
        query = query.eq('owner_id', currentUserId.value);
      }

      const { error } = await query;

      if (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar servicio: ${error.message}`, life: 5000 });
        return false;
      }

      services.value = services.value.filter(s => s.id !== serviceId);
      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Servicio eliminado correctamente.', life: 3000 });
      return true;
    } catch (err: any) {
      toast.add({ severity: 'error', summary: 'Error', detail: `Ocurrió un error: ${err.message}`, life: 5000 });
      return false;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await Preferences.remove({ key: 'supabase_refresh_token' });
      toast.add({ severity: 'success', summary: 'Sesión Cerrada', detail: 'Has cerrado sesión correctamente.', life: 3000 });
      router.push('/login');
    } catch (error: any) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cerrar sesión.', life: 3000 });
    }
  };

  const scrollToServiceAndHighlight = (serviceId: number) => {
    highlightedServiceId.value = serviceId;
    setTimeout(() => {
        const element = document.getElementById(`service-row-${serviceId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                highlightedServiceId.value = null;
            }, 3000);
        } else {
        }
    }, 100);
};
  const getServiceStatus = (service: Service) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expirationDate = new Date(service.expiration_date);
    expirationDate.setHours(0, 0, 0, 0);

    const timeDiff = expirationDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return { text: '', class: 'status-expired', daysRemaining: daysRemaining };
    } else if (daysRemaining <= 7) {
      return { text: `${daysRemaining}`, class: 'status-warning', daysRemaining: daysRemaining };
    } else {
      return { text: '', class: 'status-active', daysRemaining: daysRemaining };
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phone;
  };

  // --- NUEVAS ACCIONES PARA LA GESTIÓN DE IMÁGENES ---

  const fetchServiceImages = async (serviceId: number): Promise<ServiceImage[]> => {
    try {
      const { data, error } = await supabase
        .from('service_images')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: true });

      if (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las imágenes del servicio.', life: 3000 });
        return [];
      }
      return data as ServiceImage[];
    } catch (err: any) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al cargar las imágenes.', life: 3000 });
      return [];
    }
  };

  const uploadServiceImage = async (serviceId: number, file: File): Promise<ServiceImage | null> => {
    if (!currentUserId.value) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Debes iniciar sesión para subir imágenes.', life: 3000 });
      return null;
    }

    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const filePath = `${currentUserId.value}/${serviceId}/${fileName}`;

    try {
      const { data: storageData, error: storageError } = await supabase.storage
        .from('service-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        toast.add({ severity: 'error', summary: 'Error de Subida', detail: `Error al subir imagen: ${storageError.message}`, life: 5000 });
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('service-photos')
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener la URL pública de la imagen.', life: 3000 });
        return null;
      }

      const { data: dbData, error: dbError } = await supabase
        .from('service_images')
        .insert({
          service_id: serviceId,
          image_url: publicUrlData.publicUrl,
          file_path: filePath,
        })
        .select()
        .single();

      if (dbError) {
        await supabase.storage.from('service-photos').remove([filePath]);
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar referencia de imagen: ${dbError.message}`, life: 5000 });
        return null;
      }

      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Imagen subida correctamente.', life: 3000 });
      return dbData as ServiceImage;
    } catch (err: any) {
      console.error('Exception during image upload:', err.message);
      toast.add({ severity: 'error', summary: 'Error', detail: `Ocurrió un error al subir la imagen: ${err.message}`, life: 5000 });
      return null;
    }
  };

  const deleteServiceImage = async (imageId: number, filePath: string): Promise<boolean> => {
    if (!currentUserId.value) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Debes iniciar sesión para eliminar imágenes.', life: 3000 });
      return false;
    }

    try {
      const { error: dbError } = await supabase
        .from('service_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        console.error('Error deleting image reference from DB:', dbError.message);
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar referencia de imagen: ${dbError.message}`, life: 5000 });
        return false;
      }

      const { error: storageError } = await supabase.storage
        .from('service-photos')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting image from storage:', storageError.message);
        toast.add({ severity: 'warn', summary: 'Advertencia', detail: `Se eliminó la referencia pero no el archivo del storage: ${storageError.message}`, life: 5000 });
      }

      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Imagen eliminada correctamente.', life: 3000 });
      return true;
    } catch (err: any) {
      console.error('Exception during image deletion:', err.message);
      toast.add({ severity: 'error', summary: 'Error', detail: `Ocurrió un error al eliminar la imagen: ${err.message}`, life: 5000 });
      return false;
    }
  };

  // NUEVA ACCIÓN: Para actualizar solo la nota del servicio
  const updateServiceNote = async (serviceId: number, newNote: string | null): Promise<boolean> => {
    if (!serviceId) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'ID de servicio no proporcionado para actualizar la nota.', life: 3000 });
      return false;
    }
    if (!currentUserId.value) {
      toast.add({ severity: 'error', summary: 'Error de Autorización', detail: 'No hay usuario autenticado.', life: 3000 });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('services')
        .update({ note: newNote === '' ? null : newNote }) 
        .select();

      if (error) throw error;

      // Actualizar el servicio en el store localmente
      const index = services.value.findIndex(s => s.id === serviceId);
      if (index !== -1) {
        services.value[index].note = newNote === '' ? null : newNote;
      }
      toast.add({ severity: 'success', summary: 'Nota Actualizada', detail: 'La nota del servicio ha sido guardada.', life: 3000 });
      return true;
    } catch (error: any) {
      console.error('ServiceStore: Error al actualizar la nota del servicio:', error.message);
      toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar la nota: ${error.message}`, life: 3000 });
      return false;
    }
  };
  // NUEVA ACCIÓN: Para importar servicios desde un archivo CSV
  const importServices = async (file: File) => {
    if (userRole.value !== 'admin') {
      toast.add({ severity: 'error', summary: 'Acceso Denegado', detail: 'Solo los administradores pueden importar datos.', life: 3000 });
      return;
    }

    isImporting.value = true;
    toast.add({ severity: 'info', summary: 'Importando', detail: 'Iniciando importación de servicios...', life: 5000 });

    try {
      const text = await file.text();
      Papa.parse(text, {
        header: true, 
        skipEmptyLines: true,
        complete: async (results) => {
          const importedData = results.data as any[];
          const servicesToInsert: any[] = [];
          const errors: string[] = [];

          for (const [index, row] of importedData.entries()) {
            // Validación básica de los datos del CSV
            if (!row.name || !row.username || !row.purchase_date || !row.expiration_date || !row.amount) {
              errors.push(`Fila ${index + 2}: Datos incompletos. Se omitió.`); 
              continue;
            }

            // Convertir tipos de datos y formatear para Supabase
            try {
              const formattedService = {
                name: row.name,
                username: row.username,
                purchase_date: new Date(row.purchase_date).toISOString().split('T')[0],
                expiration_date: new Date(row.expiration_date).toISOString().split('T')[0],
                phone: row.phone || null,
                server: row.server || null,
                device: row.device ? row.device.split(',').map((d: string) => d.trim()) : [],
                payment_method: row.payment_method || null,
                amount: parseFloat(row.amount),
                note: row.note || null,
                owner_id: row.owner_id || currentUserId.value, // Si no se especifica, usa el ID del admin
              };
              servicesToInsert.push(formattedService);
            } catch (e: any) {
              errors.push(`Fila ${index + 2}: Error de formato - ${e.message}. Se omitió.`);
            }
          }

          if (servicesToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('services')
              .insert(servicesToInsert);

            if (insertError) {
              console.error('Error al insertar servicios importados:', insertError.message);
              toast.add({ severity: 'error', summary: 'Error de Importación', detail: `Fallo al insertar en la base de datos: ${insertError.message}`, life: 5000 });
            } else {
              toast.add({ severity: 'success', summary: 'Importación Exitosa', detail: `${servicesToInsert.length} servicios importados.`, life: 3000 });
              await fetchServices(); 
            }
          } else {
            toast.add({ severity: 'warn', summary: 'Importación', detail: 'No se encontraron servicios válidos para importar.', life: 3000 });
          }

          if (errors.length > 0) {
            toast.add({
              severity: 'warn',
              summary: 'Errores en Importación',
              detail: `Se encontraron ${errors.length} errores. Consulta la consola para más detalles.`,
              life: 10000
            });
            console.error('Errores detallados en la importación:', errors);
          }
        }
      });
    } catch (err: any) {
      console.error('Excepción al importar servicios:', err.message);
      toast.add({ severity: 'error', summary: 'Error', detail: `Ocurrió un error al procesar el archivo: ${err.message}`, life: 5000 });
    } finally {
      isImporting.value = false;
    }
  };

  // NUEVA ACCIÓN: Para exportar servicios a un archivo CSV
  const exportServices = async () => {
    isExporting.value = true;
    toast.add({ severity: 'info', summary: 'Exportando', detail: 'Preparando servicios para exportar...', life: 3000 });

    try {
      let query = supabase.from('services').select('*');
      if (userRole.value !== 'admin') {
        query = query.eq('owner_id', currentUserId.value);
      }
      query = query.order('id', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error al recuperar servicios para exportar:', error.message);
        toast.add({ severity: 'error', summary: 'Error de Exportación', detail: 'No se pudieron recuperar los servicios para exportar.', life: 3000 });
        return;
      }

      if (!data || data.length === 0) {
        toast.add({ severity: 'warn', summary: 'Exportación', detail: 'No hay servicios para exportar.', life: 3000 });
        return;
      }

      // Prepara los datos para CSV
      const csvData = data.map(service => ({
        id: service.id,
        name: service.name,
        username: service.username,
        purchase_date: service.purchase_date,
        expiration_date: service.expiration_date,
        phone: service.phone,
        server: service.server,
        device: Array.isArray(service.device) ? service.device.join(', ') : '',
        payment_method: service.payment_method,
        amount: service.amount,
        note: service.note,
        owner_id: service.owner_id,
        created_at: service.created_at,
      }));

      const csv = Papa.unparse(csvData);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) { 
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `servicios_exportados_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.add({ severity: 'success', summary: 'Exportación Exitosa', detail: 'Servicios exportados a CSV.', life: 3000 });
      } else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Tu navegador no soporta la descarga directa de archivos.', life: 5000 });
      }

    } catch (err: any) {
      console.error('Excepción al exportar servicios:', err.message);
      toast.add({ severity: 'error', summary: 'Error', detail: `Ocurrió un error al exportar: ${err.message}`, life: 5000 });
    } finally {
      isExporting.value = false;
    }
  };

const handleEditService = (service: Service) => {
  const purchaseDate = service.purchase_date instanceof Date
    ? service.purchase_date
    : new Date(service.purchase_date);
  const expirationDate = service.expiration_date instanceof Date
    ? service.expiration_date
    : new Date(service.expiration_date);

  const serviceForForm: NewServiceInput = {
    id: service.id,
    name: service.name,
    username: service.username,
    purchase_date: purchaseDate,
    expiration_date: expirationDate,
    phone: service.phone,
    server: service.server,
    device: service.device,
    deviceCounts: parseDeviceArrayToCounts(service.device),
    payment_method: service.payment_method,
    amount: service.amount,
    note: service.note === '' ? null : service.note,
    owner_id: service.owner_id,
    images: service.images || [],
  };

  newServiceFormData.value = serviceForForm;
  isAddingClient.value = true;
};

  const showServiceInfoScreen = async (service: Service) => {
    const serviceWithImages = { ...service };
    if (!serviceWithImages.images || serviceWithImages.images.length === 0) {
      serviceWithImages.images = await fetchServiceImages(service.id!);
    }
    currentServiceForInfo.value = serviceWithImages;
    isShowingServiceInfo.value = true;
    isAddingClient.value = false; 
  };

  const closeServiceInfoScreen = () => {
    isShowingServiceInfo.value = false;
    currentServiceForInfo.value = null;
    fetchServices();
  };

  // --- GETTERS (PROPIEDADES COMPUTADAS DEL STORE) ---
  const getUpcomingServices = computed(() => {
    if (!services.value) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = services.value.filter(service => {
      const expirationDate = service.expiration_date instanceof Date ? service.expiration_date : new Date(service.expiration_date);
      expirationDate.setHours(0, 0, 0, 0);
      const timeDiff = expirationDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      return daysRemaining > 0 && daysRemaining <= 30;
    });

    upcoming.sort((a, b) => {
      const dateA = new Date(a.expiration_date).getTime();
      const dateB = new Date(b.expiration_date).getTime();
      return dateA - dateB;
    });

    return upcoming;
  });

  const getActiveServices = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return services.value.filter(service => {
        const expirationDate = service.expiration_date instanceof Date ? service.expiration_date : new Date(service.expiration_date);
        expirationDate.setHours(0, 0, 0, 0);
        const timeDiff = expirationDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        return daysRemaining > 0;
    });
  });

  return {
    // Estado
    services,
    userDisplayName,
    isAddingClient,
    showServiceTable,
    isSidebarCollapsed,
    newServiceFormData,
    serverOptions,
    paymentMethodOptions,
    deviceOptions,
    currentUserId,
    userProfile,
    allUserProfiles, 
    userRole,
    isShowingServiceInfo,
    currentServiceForInfo,
    isExporting,
    isImporting,


    // Acciones
    fetchUser,
    fetchServices,
    saveNewService,
    updateService,
    deleteService,
    setClientFormActive: (active: boolean) => { isAddingClient.value = active; },
    toggleSidebar: () => {
      isSidebarCollapsed.value = !isSidebarCollapsed.value;
      },
    toggleServiceTableView: () => { showServiceTable.value = !showServiceTable.value; },
    setHighlightedService: (id: number | null) => { highlightedServiceId.value = id; },
    initialDeviceCounts,
    parseDeviceArrayToCounts,
    formatDeviceCountsToArray,
    logout,
    fetchServiceImages,
    uploadServiceImage,
    deleteServiceImage,
    showServiceInfoScreen,
    closeServiceInfoScreen,
    handleEditService,
    updateServiceNote,
    resetNewServiceFormData,
    importServices,
    exportServices,


    // Funciones de utilidad
    getServiceStatus,
    formatPhoneNumber,

    // Getters computados
    getUpcomingServices,
    getActiveServices,
    highlightedServiceId,
    scrollToServiceAndHighlight,
    
  };
});
