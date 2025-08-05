// src/types/Service.ts

// Interfaz para una imagen de servicio
export interface ServiceImage {
    id?: number; 
    service_id: number;
    image_url: string;
    file_path: string; 
    created_at?: string; 
}
export interface UserProfile {
  id: string;
  username: string;
  role: 'admin' | 'user';
}
// Interfaz principal para un servicio
export interface Service {
    id?: number;
    updated_at: string;
    name: string;
    username: string;
    purchase_date: Date | string;
    expiration_date: Date | string;
    phone: string;
    server: string;
    device: string[]; 
    deviceCounts?: { [key: string]: number }; 
    payment_method: string;
    amount: number;
    note: string | null; 
    owner_id: string;
    created_at: string; 
    renewals: RenewalRecord[];
    images?: ServiceImage[];
    renewal_counter: number; 
}

// Interfaz para la entrada de un nuevo servicio (sin ID, con deviceCounts para el formulario)
export interface NewServiceInput {
    id?: number; 
    name: string;
    username: string;
    purchase_date: Date; 
    expiration_date: Date;
    phone: string;
    server: string;
    device: string[];
    deviceCounts?: { [key: string]: number }; 
    payment_method: string;
    amount: number;
    note: string | null;
    owner_id: string;
    images?: ServiceImage[];
    renewal_counter?: number; 
}
// Interfaz para el registro de una renovación (NUEVO)
export interface RenewalRecord {
    service_id: number;
    renewal_date: Date;
    new_expiration_date: Date;
    amount: number;
    payment_method: string;
    note?: string;
}
export interface RenewalLog {
  id?: number;
  service_id: number;
  client_name: string;
  username: string;
  renewal_date?: Date;
  renewal_number: number;
  server: string;
  payment_method: string;
  amount: number;
  owner_username: string;
  created_at: string;
}