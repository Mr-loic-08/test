export type PropertyType = 'appartement' | 'studio' | 'rez-de-chaussee';
export type PropertyStatus = 'libre' | 'occupe' | 'reserve' | 'maintenance';
export type ContractStatus = 'a_venir' | 'actif' | 'expire' | 'resilie';
export type PaymentStatus = 'PAYE' | 'NON_PAYE' | 'INCOMPLET';
export type MaintenanceStatus = 'signale' | 'en_cours' | 'termine' | 'annule';
export type MaintenancePriority = 'basse' | 'moyenne' | 'haute' | 'urgente';
export type PaymentMethod = 'especes' | 'virement' | 'cheque' | 'mobile_money' | 'autre';
export type PaymentKind = 'loyer' | 'eau' | 'mixte';
export type DocumentType = 'contrat' | 'piece' | 'recu' | 'etat_lieux' | 'facture' | 'autre';
export type MeterStatus = 'actif' | 'inactif' | 'remplace';

export interface Property {
  id: string;
  reference: string;
  type: PropertyType;
  address: string;
  etage?: string;
  surface?: number;
  description: string;
  monthlyRent: number;
  charges?: number;
  status: PropertyStatus;
  notes?: string;
  equipements?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address: string;
  idType?: string;
  idNumber?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  reference: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  charges?: number;
  depositAmount: number;
  dueDay: number;
  conditions?: string;
  status: ContractStatus;
  createdAt: string;
}

export interface RentSchedule {
  id: string;
  contractId: string;
  month: number; // 1-12
  year: number;
  amountDue: number;
  createdAt: string;
}

export interface WaterMeter {
  id: string;
  propertyId: string;
  meterNumber: string;
  installationDate: string;
  status: MeterStatus;
  createdAt: string;
}

export interface WaterReading {
  id: string;
  meterId: string;
  readingDate: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  tariffPerM3: number;
  periodMonth: number;
  periodYear: number;
  createdAt: string;
}

export interface WaterInvoice {
  id: string;
  contractId: string;
  meterId: string;
  readingId?: string;
  periodMonth: number;
  periodYear: number;
  previousIndex: number;
  currentIndex: number;
  consumption: number;
  tariffPerM3: number;
  amountDue: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  reference: string;
  tenantId: string;
  contractId: string;
  propertyId: string;
  paymentDate: string;
  amount: number;
  method: PaymentMethod;
  kind: PaymentKind;
  comment?: string;
  createdAt: string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  rentScheduleId?: string;
  waterInvoiceId?: string;
  allocatedAmount: number;
  createdAt: string;
}

export interface WaterTariff {
  id: string;
  pricePerM3: number;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
}

export interface MaintenanceItem {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  cost?: number;
  provider?: string;
  status: MaintenanceStatus;
  reportedAt: string;
  completedAt?: string;
  notes?: string;
}

export interface DocFile {
  id: string;
  name: string;
  type: DocumentType;
  tenantId?: string;
  propertyId?: string;
  contractId?: string;
  paymentId?: string;
  filePath?: string;
  size?: string;
  mime?: string;
  createdAt: string;
}

export interface AppSettings {
  landlordName: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  receiptHeader: string;
  receiptFooter: string;
  dueDayDefault: number;
  lastBackup?: string;
  backupFolder?: string;
  // Notifications sonores
  soundEnabled: boolean;
  soundVolume: number; // 0..1
  soundOnAlerts: boolean;
  soundOnPayment: boolean;
  soundOnClick: boolean;
  // Sauvegarde automatique
  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
  lastAutoBackup?: string;
  autoBackupCount: number;
  // Alertes métier
  waterReadingDay: number; // jour du mois prévu pour le prélèvement compteur
  rentLateGraceDays: number; // délai de grâce avant signalement retard
  alertRentDaysBefore: number;
}

export interface AppState {
  properties: Property[];
  tenants: Tenant[];
  contracts: Contract[];
  rentSchedules: RentSchedule[];
  waterMeters: WaterMeter[];
  waterReadings: WaterReading[];
  waterInvoices: WaterInvoice[];
  payments: Payment[];
  allocations: PaymentAllocation[];
  waterTariffs: WaterTariff[];
  maintenances: MaintenanceItem[];
  documents: DocFile[];
  settings: AppSettings;
}
