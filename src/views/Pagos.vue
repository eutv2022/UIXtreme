<template>
    <div class="bg-gray-50 dark:bg-gray-900 min-h-screen p-6">
    
    <!-- Contenedor de la cabecera y los filtros -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      
      <!-- Fila que contiene el botón "Volver" y el título de la página -->
      <div class="flex items-center mb-4">
        <Button
          label="Volver"
          icon="pi pi-arrow-left"
          class="p-button-text p-button-secondary mr-4"
          @click="goBackToDashboard"
        />
        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Reporte de Pagos
        </h2>
      </div>

      <!-- Fila para los Dropdowns -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Dropdown de Quincenas -->
        <div class="flex flex-col">
          <label for="quincena-select" class="font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quincena
          </label>
          <Dropdown
            id="quincena-select"
            v-model="selectedQuincena"
            :options="quincenaOptions"
            optionLabel="label"
            optionGroupLabel="label"
            optionGroupChildren="items"
            placeholder="Selecciona una quincena"
            class="w-full"
          />
        </div>

        <!-- Dropdown de Vendedores (visible solo para administradores) -->
        <div v-if="isAdmin" class="flex flex-col">
          <label for="vendor-select" class="font-medium text-gray-700 dark:text-gray-300 mb-1">
            Vendedor
          </label>
          <Dropdown
            id="vendor-select"
            v-model="selectedVendor"
            :options="allVendors"
            optionLabel="username"
            placeholder="Selecciona un vendedor"
            class="w-full"
          />
        </div>
      </div>
    </div>
    
    <!-- Tabla de Reporte de Pagos -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div v-if="loading" class="flex justify-center items-center p-8">
        <ProgressSpinner />
      </div>
      <DataTable
        v-else
        :value="paymentReportData"
        class="w-full cursor-pointer"
        showGridlines
        stripedRows
        :paginator="paymentReportData.length > 10"
        :rows="10"
        @row-click="onRowSelect"
      >
        <Column field="vendorName" header="Vendedor"></Column>
        <Column field="newSalesUSD" header="Nuevas Ventas USD">
          <template #body="{ data }">
            ${{ data.newSalesUSD }}
          </template>
        </Column>
        <Column field="renewalsUSD" header="Renovaciones USD">
          <template #body="{ data }">
            ${{ data.renewalsUSD }}
          </template>
        </Column>
        <Column field="totalPayCOP" header="Total a Pagar COP">
          <template #body="{ data }">
            {{ formatCurrency(data.totalPayCOP) }}
          </template>
        </Column>
        <Column field="status" header="Estado">
          <template #body="{ data }">
            <Tag :severity="getSeverity(data.status)" :value="data.status" />
          </template>
        </Column>
        <Column v-if="isAdmin" header="Acciones">
          <template #body="{ data }">
            <div class="flex space-x-2">
              <Button
                icon="pi pi-dollar"
                label="Liquidar"
                class="p-button-sm p-button-success"
                :disabled="data.isLiquidated"
                @click="showLiquidationConfirmation(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
    
    <!-- Diálogo de Liquidación -->
    <Dialog
      v-model:visible="showLiquidationDialog"
      modal
      header="Confirmar Liquidación"
      :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    >
      <div class="max-h-[60vh] overflow-y-auto pr-2">
        <div class="p-fluid">
          <div class="field mb-4">
            <label for="total-to-pay" class="font-medium">Total a Liquidar:</label>
            <InputNumber
              id="total-to-pay"
              v-model="currentTotalToLiquidate"
              mode="currency"
              currency="COP"
              locale="es-CO"
              :disabled="true"
              class="w-full"
            />
          </div>
          <div class="field mb-4">
            <label for="paid-so-far" class="font-medium">Pagado hasta ahora:</label>
            <InputNumber
              id="paid-so-far"
              v-model="paidAmountForLiquidation"
              mode="currency"
              currency="COP"
              locale="es-CO"
              :disabled="true"
              class="w-full"
            />
          </div>
          <div class="field mb-4">
            <label for="prev-payment-method" class="font-medium">Método de Pago Anterior</label>
            <Dropdown
              id="prev-payment-method"
              v-model="selectedPreviousPaymentMethod"
              :options="paymentMethods"
              placeholder="Selecciona un método"
              class="w-full"
            />
          </div>
          <div class="field mb-4">
            <label for="prev-payment-amount" class="font-medium">Monto Anterior</label>
            <InputNumber
              id="prev-payment-amount"
              v-model="previousPaymentsAmount"
              mode="currency"
              currency="COP"
              locale="es-CO"
              class="w-full"
            />
          </div>
          <div class="field mb-4">
            <label for="payment-method" class="font-medium">Método de Pago Actual</label>
            <Dropdown
              id="payment-method"
              v-model="paymentMethod"
              :options="paymentMethods"
              placeholder="Selecciona un método"
              class="w-full"
            />
          </div>
          <div class="field mb-4">
            <label for="amount-to-pay" class="font-medium">Monto a Pagar Ahora</label>
            <InputNumber
              id="amount-to-pay"
              v-model="amountToPay"
              mode="currency"
              currency="COP"
              locale="es-CO"
              class="w-full"
            />
          </div>
          <div class="field mb-4">
            <label for="final-balance" class="font-medium">Balance Final:</label>
            <InputNumber
              id="final-balance"
              v-model="finalBalance"
              mode="currency"
              currency="COP"
              locale="es-CO"
              :disabled="true"
              class="w-full"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" icon="pi pi-times" text @click="showLiquidationDialog = false" />
        <Button label="Confirmar" icon="pi pi-check" @click="confirmLiquidation" />
      </template>
    </Dialog>
    
    <!-- Diálogo de Detalles de Liquidación -->
    <Dialog
      v-model:visible="showDetailsDialog"
      modal
      header="Detalles de Liquidación"
      :breakpoints="{ '960px': '50vw', '640px': '90vw' }"
      :contentStyle="{ maxHeight: '60vh', overflowY: 'auto' }"
      contentClass="max-h-[60vh] overflow-y-auto"
    >
      <div v-if="selectedLiquidationDetails" class="p-fluid">
        <p><strong>Fecha de Liquidación:</strong> {{ new Date(selectedLiquidationDetails.liquidation_date).toLocaleDateString() }}</p>
        <p><strong>Estado:</strong> {{ selectedLiquidationDetails.status }}</p>
        <p><strong>Total a Pagar:</strong> {{ formatCurrency(selectedLiquidationDetails.total_to_pay_cop) }}</p>
        <p><strong>Monto Pagado:</strong> {{ formatCurrency(selectedLiquidationDetails.amount_paid_cop) }}</p>
        <p><strong>Balance Final:</strong> {{ formatCurrency(selectedLiquidationDetails.final_balance_cop) }}</p>
        <p><strong>Método de Pago (Anterior):</strong> {{ selectedLiquidationDetails.previous_payment_method || 'N/A' }}</p>
        <p><strong>Método de Pago (Actual):</strong> {{ selectedLiquidationDetails.payment_method || 'N/A' }}</p>
      </div>
      <template #footer>
        <Button label="Cerrar" icon="pi pi-times" @click="showDetailsDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import ProgressSpinner from 'primevue/progressspinner';
import { useServiceStore } from '@/stores/services';
import { supabase } from '@/supabase';

interface UserProfile {
  id: string;
  username: string | null;
  role: string | null;
}
interface Service {
  id: number;
  owner_id: string;
  amount: number;
  purchase_date: string;
  [key: string]: any;
}
interface RenewalLog {
  id: number;
  service_id: number;
  amount: number;
  created_at: string;
  [key: string]: any;
}

// Data types
interface PaymentReport {
  vendorId: string;
  vendorName: string;
  newSalesUSD: number;
  renewalsUSD: number;
  totalPayCOP: number;
  status: string;
  isLiquidated: boolean;
  amountPaidSoFar: number;
  liquidationDetails: LiquidationDetail | null;
}

interface LiquidationDetail {
  liquidation_date: string;
  status: string;
  total_to_pay_cop: number;
  amount_paid_cop: number;
  final_balance_cop: number;
  previous_payment_method: string | null;
  payment_method: string | null;
}

interface QuincenaOption {
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

interface QuincenaGroup {
  label: string;
  items: QuincenaOption[];
}

// State variables
const serviceStore = useServiceStore();
const paymentReportData = ref<PaymentReport[]>([]);
const quincenaOptions = ref<QuincenaGroup[]>([]);
const selectedQuincena = ref<QuincenaOption | null>(null);
const loading = ref(false);
const showLiquidationDialog = ref(false);
const allVendors = ref<UserProfile[]>([]);

const selectedVendor = ref<UserProfile | null>(null);
const allVendorsOption: UserProfile = { id: 'all', username: 'Todos los vendedores', role: null };

const paymentMethod = ref<string | null>(null);
const paymentMethods = ref(['Bancolombia', 'Efectivo', 'BBVA']);
const currentTotalToLiquidate = ref(0);
const paidAmountForLiquidation = ref(0);

const selectedPreviousPaymentMethod = ref<string | null>(null);
const previousPaymentsAmount = ref<number | null>(0);

const amountToPay = ref<number | null>(0);
const showDetailsDialog = ref(false);
const selectedLiquidationDetails = ref<LiquidationDetail | null>(null);
const router = useRouter();
const goBackToDashboard = () => {
  // Navega al dashboard correcto según el rol del usuario
  if (isAdmin.value) {
    router.push({ name: 'dashboardAdmin' }); 
  } else {
    router.push({ name: 'dashboardUser' }); 
  }
};
// =============================================================
//  HELPERS & COMPUTED PROPERTIES
// =============================================================

const isAdmin = computed(() => serviceStore.userProfile?.role === 'admin');

const finalBalance = computed(() => {
  const previous = previousPaymentsAmount.value || 0;
  const current = amountToPay.value || 0;
  return currentTotalToLiquidate.value - paidAmountForLiquidation.value - previous - current;
});

// Dynamically generate fortnight options with group formatting
const generateQuincenaOptions = () => {
  const options: QuincenaGroup[] = [];
  const now = new Date();
  let currentMonth = now.getMonth();
  let currentYear = now.getFullYear();

  for (let i = 0; i < 6; i++) {
    const monthName = new Date(currentYear, currentMonth).toLocaleString('es-ES', { month: 'long' });
    const monthGroup: QuincenaGroup = {
      label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      items: []
    };

    // 2nd fortnight
    const secondHalfEnd = new Date(currentYear, currentMonth + 1, 0);
    const secondHalfStart = new Date(currentYear, currentMonth, 16);
    monthGroup.items.push({
      label: '2da quincena',
      value: `q2-${currentYear}-${currentMonth}`,
      startDate: secondHalfStart,
      endDate: secondHalfEnd
    });

    // 1st fortnight
    const firstHalfStart = new Date(currentYear, currentMonth, 1);
    const firstHalfEnd = new Date(currentYear, currentMonth, 15);
    monthGroup.items.push({
      label: '1ra quincena',
      value: `q1-${currentYear}-${currentMonth}`,
      startDate: firstHalfStart,
      endDate: firstHalfEnd
    });
    
    options.push(monthGroup);

    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
  }

  quincenaOptions.value = options;
  if (options.length > 0 && options[0].items.length > 0) {
    selectedQuincena.value = options[0].items[0];
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
};

const getSeverity = (status: string) => {
  switch (status) {
    case 'Liquidado':
      return 'success';
    case 'A Favor':
      return 'info';
    case 'Abonado':
      return 'warning';
    case 'Pendiente':
    default:
      return 'secondary';
  }
};

const onRowSelect = (event: { data: PaymentReport }) => {
  const data = event.data;
  if (data && data.liquidationDetails) {
    selectedLiquidationDetails.value = data.liquidationDetails;
    showDetailsDialog.value = true;
  }
};

const calculatePayments = async (startDate: Date | null, endDate: Date | null, vendorId: string | null) => {
  // Only execute if a fortnight is selected
  if (!startDate || !endDate) {
    paymentReportData.value = [];
    return;
  }

  loading.value = true;
  paymentReportData.value = [];

  const vendorReports: { [key: string]: { newSalesUSD: number; renewalsUSD: number; vendorName: string } } = {};
  
  try {
    // If a specific vendor is selected, use their ID. If 'All' is selected, use all IDs.
    const vendorsToQuery = vendorId && vendorId !== 'all'
      ? [vendorId]
      : allVendors.value.filter(v => v.id !== 'all').map(v => v.id);

    // If there are no vendors to query, exit the function
    if (vendorsToQuery.length === 0) {
      loading.value = false;
      return;
    }

    // Query for services
    let servicesQuery = supabase
      .from('services')
      .select('id, owner_id, amount')
      .gte('purchase_date', startDate.toISOString())
      .lte('purchase_date', endDate.toISOString())
      .in('owner_id', vendorsToQuery);

    const { data: services, error: servicesError } = await servicesQuery;
    if (servicesError) throw servicesError;

    // Query for renewals
    const serviceIds = services.map(s => s.id);
    let renewalsQuery = supabase
      .from('renewals')
      .select('service_id, amount')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .in('service_id', serviceIds);

    const { data: renewals, error: renewalsError } = await renewalsQuery;
    if (renewalsError) throw renewalsError;

    const allUserProfiles = allVendors.value || [];

    // Add new sales to each vendor
    if (services) {
      services.forEach((service) => {
        if (!vendorReports[service.owner_id]) {
          const vendor = allUserProfiles.find((p) => p.id === service.owner_id);
          vendorReports[service.owner_id] = {
            newSalesUSD: 0,
            renewalsUSD: 0,
            vendorName: vendor?.username || 'Desconocido',
          };
        }
        vendorReports[service.owner_id].newSalesUSD += service.amount;
      });
    }

    // Add renewals to each vendor
    if (renewals) {
      renewals.forEach((renewal) => {
        const service = services.find(s => s.id === renewal.service_id);
        if (service) {
          const ownerId = service.owner_id;
          if (!vendorReports[ownerId]) {
            const vendor = allUserProfiles.find((p) => p.id === ownerId);
            vendorReports[ownerId] = {
              newSalesUSD: 0,
              renewalsUSD: 0,
              vendorName: vendor?.username || 'Desconocido',
            };
          }
          vendorReports[ownerId].renewalsUSD += renewal.amount;
        }
      });
    }
    
    // Process each report and add to the table
    for (const vendorIdKey in vendorReports) {
      const report = vendorReports[vendorIdKey];
      const dollarRate = 4000;
      const totalPayCOP = (report.newSalesUSD + report.renewalsUSD) * dollarRate * 0.5;

      const { data: liquidationData, error: liquidationError } = await supabase
        .from('payments_liquidated')
        .select('*')
        .eq('quincena', selectedQuincena.value?.value)
        .eq('vendor_id', vendorIdKey);

      if (liquidationError) throw liquidationError;

      const liquidationRecord = liquidationData && liquidationData.length > 0 ? liquidationData[0] : null;
      
      let status = 'Pendiente';
      let isLiquidated = false;
      let amountPaidSoFar = 0;
      let liquidationDetails: LiquidationDetail | null = null;
      
      if (liquidationRecord) {
        status = liquidationRecord.status;
        amountPaidSoFar = liquidationRecord.amount_paid_cop || 0;
        isLiquidated = liquidationRecord.final_balance_cop <= 0;
        
        liquidationDetails = {
          liquidation_date: liquidationRecord.liquidation_date,
          status: liquidationRecord.status,
          total_to_pay_cop: liquidationRecord.total_to_pay_cop,
          amount_paid_cop: liquidationRecord.amount_paid_cop,
          final_balance_cop: liquidationRecord.final_balance_cop,
          previous_payment_method: liquidationRecord.previous_payment_method,
          payment_method: liquidationRecord.payment_method,
        };
      }

      paymentReportData.value.push({
        vendorId: vendorIdKey,
        vendorName: report.vendorName,
        newSalesUSD: report.newSalesUSD,
        renewalsUSD: report.renewalsUSD,
        totalPayCOP: totalPayCOP,
        status: status,
        isLiquidated: isLiquidated,
        amountPaidSoFar: amountPaidSoFar,
        liquidationDetails: liquidationDetails,
      });
    }

  } catch (error) {
    console.error('Error calculating payments:', error);
  } finally {
    loading.value = false;
  }
};

const showLiquidationConfirmation = (data: PaymentReport) => {
  currentTotalToLiquidate.value = data.totalPayCOP;
  paidAmountForLiquidation.value = data.amountPaidSoFar;
  selectedVendor.value = allVendors.value.find(v => v.id === data.vendorId) || null;
  selectedPreviousPaymentMethod.value = null;
  previousPaymentsAmount.value = 0;
  paymentMethod.value = null;
  amountToPay.value = 0;
  showLiquidationDialog.value = true;
};

const confirmLiquidation = async () => {
  if (!selectedQuincena.value || !selectedVendor.value || !paymentMethod.value) {
    console.error('Missing data for liquidation.');
    return;
  }
  
  loading.value = true;
  
  const totalAmountPaidNow = (previousPaymentsAmount.value || 0) + (amountToPay.value || 0);
  const totalAmountPaid = paidAmountForLiquidation.value + totalAmountPaidNow;
  const newFinalBalance = currentTotalToLiquidate.value - totalAmountPaid;

  let liquidationStatus = 'Pendiente';
  if (newFinalBalance <= 0) {
    liquidationStatus = 'Liquidado';
  } else if (totalAmountPaid > 0) {
    liquidationStatus = 'Abonado';
  }

  const liquidationRecord = {
    quincena: selectedQuincena.value.value,
    vendor_id: selectedVendor.value.id,
    status: liquidationStatus,
    total_to_pay_cop: currentTotalToLiquidate.value,
    amount_paid_cop: totalAmountPaid,
    final_balance_cop: newFinalBalance,
    start_date: selectedQuincena.value.startDate.toISOString(),
    end_date: selectedQuincena.value.endDate.toISOString(),
    liquidation_date: new Date().toISOString(),
    previous_payment_method: selectedPreviousPaymentMethod.value,
    payment_method: paymentMethod.value,
  };

  try {
    const { data: existingRecord, error: findError } = await supabase
      .from('payments_liquidated')
      .select('id')
      .eq('quincena', selectedQuincena.value.value)
      .eq('vendor_id', selectedVendor.value.id)
      .maybeSingle();

    if (findError) throw findError;

    if (existingRecord) {
      const { error } = await supabase
        .from('payments_liquidated')
        .update(liquidationRecord)
        .eq('id', existingRecord.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('payments_liquidated')
        .insert(liquidationRecord);
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error saving liquidation:', error);
  } finally {
    showLiquidationDialog.value = false;
    await calculatePayments(selectedQuincena.value?.startDate || null, selectedQuincena.value?.endDate || null, selectedVendor.value?.id || null);
    loading.value = false;
  }
};

// =============================================================
//  INITIALIZATION AND WATCHERS
// =============================================================

// Main watcher for payment calculation.
watch(
  [selectedQuincena, selectedVendor],
  ([newQuincena, newVendor]) => {
    // The logic has been adjusted to handle the 'All vendors' option
    if (newQuincena) {
      calculatePayments(newQuincena.startDate, newQuincena.endDate, newVendor?.id || null);
    } else {
      paymentReportData.value = [];
    }
  },
  { immediate: true }
);

onMounted(async () => {
  generateQuincenaOptions();

  // Get current user profile for default selection
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*');

  if (profilesError) {
    console.error('Error fetching all profiles:', profilesError);
    return;
  }
  
  // Add the 'All vendors' option at the beginning of the list
  allVendors.value = [allVendorsOption, ...profiles] as UserProfile[];

  if (user) {
    const currentUserProfile = profiles.find(p => p.id === user.id);
    if (currentUserProfile) {
      // If user is an admin, select 'All vendors' by default
      if (currentUserProfile.role === 'admin') {
        selectedVendor.value = allVendorsOption;
      } else {
        // If user is a regular vendor, select their own profile
        selectedVendor.value = currentUserProfile;
      }
    }
  } else {
    // If no user is logged in, select 'All vendors' by default
    selectedVendor.value = allVendorsOption;
  }
});
</script>

<style scoped>
.p-button-sm {
  font-size: 0.875rem;
  padding: 0.5rem 0.875rem;
}

</style>
