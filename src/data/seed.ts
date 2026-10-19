import type { AppState } from '../types';

export const seedState: AppState = {
  properties: [
    { id: 'prop_a01', reference: 'A01', type: 'appartement', address: 'Rue 12, Cocody, Abidjan', etage: '1er', surface: 75, description: 'Bel appartement lumineux avec balcon, 2 chambres, salon, cuisine équipée.', monthlyRent: 450000, charges: 30000, status: 'occupe', notes: '', equipements: ['Cuisine équipée', 'Balcon', 'Parking', 'Climatisation'], createdAt: '2024-01-10', updatedAt: '2026-01-10' },
    { id: 'prop_a02', reference: 'A02', type: 'appartement', address: 'Rue 12, Cocody, Abidjan', etage: '1er', surface: 65, description: 'Appartement 2 pièces rénové, proche commerces.', monthlyRent: 400000, charges: 25000, status: 'occupe', notes: '', equipements: ['Balcon', 'Parking'], createdAt: '2024-01-10', updatedAt: '2026-01-10' },
    { id: 'prop_a03', reference: 'A03', type: 'appartement', address: 'Rue 12, Cocody, Abidjan', etage: '2ème', surface: 80, description: 'Bel appartement lumineux avec balcon, vue dégagée.', monthlyRent: 500000, charges: 50000, status: 'occupe', notes: '', equipements: ['Cuisine équipée', 'Balcon', 'Parking'], createdAt: '2024-01-10', updatedAt: '2026-01-10' },
    { id: 'prop_b01', reference: 'B01', type: 'studio', address: 'Rue 8, Plateau, Abidjan', etage: 'RDC', surface: 30, description: 'Studio moderne meublé, idéal jeune actif.', monthlyRent: 250000, charges: 15000, status: 'occupe', notes: '', equipements: ['Meublé', 'Climatisation'], createdAt: '2024-02-01', updatedAt: '2026-01-10' },
    { id: 'prop_b02', reference: 'B02', type: 'studio', address: 'Rue 8, Plateau, Abidjan', etage: 'RDC', surface: 32, description: 'Studio avec kitchenette et salle d\'eau moderne.', monthlyRent: 270000, charges: 15000, status: 'occupe', notes: '', equipements: ['Kitchenette', 'Parking'], createdAt: '2024-02-01', updatedAt: '2026-01-10' },
    { id: 'prop_c01', reference: 'C01', type: 'rez-de-chaussee', address: 'Rue 5, Yopougon, Abidjan', etage: 'RDC', surface: 90, description: 'Rez-de-chaussée 3 pièces avec cour privée.', monthlyRent: 600000, charges: 20000, status: 'occupe', notes: '', equipements: ['Cour privée', 'Parking', 'Forage'], createdAt: '2024-03-01', updatedAt: '2026-01-10' },
    { id: 'prop_a04', reference: 'A04', type: 'appartement', address: 'Rue 12, Cocody, Abidjan', etage: '3ème', surface: 70, description: 'Appartement en cours de rénovation.', monthlyRent: 420000, charges: 25000, status: 'maintenance', notes: 'Peinture + plomberie en cours', equipements: ['Balcon'], createdAt: '2025-06-01', updatedAt: '2026-09-10' },
    { id: 'prop_b03', reference: 'B03', type: 'studio', address: 'Rue 8, Plateau, Abidjan', etage: '1er', surface: 28, description: 'Studio libre de suite.', monthlyRent: 240000, charges: 12000, status: 'libre', notes: '', equipements: [], createdAt: '2025-06-01', updatedAt: '2026-09-10' },
  ],
  tenants: [
    { id: 'ten_jean', firstName: 'Jean', lastName: 'Dupont', phone: '07 12 34 56 78', email: 'jean.dupont@email.com', address: 'Rue 12, Cocody', idType: 'CNI', idNumber: 'CI-12345678', emergencyContact: 'Marie Dupont', emergencyPhone: '05 00 11 22 33', notes: 'Locataire sérieux.', createdAt: '2025-01-05' },
    { id: 'ten_marie', firstName: 'Marie', lastName: 'Martin', phone: '07 98 76 54 32', email: 'marie.martin@email.com', address: 'Rue 8, Plateau', idType: 'Passeport', idNumber: 'P-987654', emergencyContact: 'Paul Martin', emergencyPhone: '07 11 22 33 44', notes: '', createdAt: '2025-02-10' },
    { id: 'ten_thomas', firstName: 'Thomas', lastName: 'Bernard', phone: '05 55 66 77 88', email: '', address: 'Rue 5, Yopougon', idType: 'CNI', idNumber: 'CI-55566677', emergencyContact: 'Luc Bernard', emergencyPhone: '05 44 33 22 11', notes: 'Paiements parfois en retard.', createdAt: '2025-01-15' },
    { id: 'ten_sophie', firstName: 'Sophie', lastName: 'Durand', phone: '07 22 33 44 55', email: 'sophie.d@email.com', address: 'Rue 12, Cocody', idType: 'CNI', idNumber: 'CI-22334455', emergencyContact: 'Karim Durand', emergencyPhone: '07 99 88 77 66', notes: '', createdAt: '2025-04-20' },
    { id: 'ten_lucas', firstName: 'Lucas', lastName: 'Moreau', phone: '05 11 22 33 44', email: 'lucas.moreau@email.com', address: 'Rue 8, Plateau', idType: 'Permis', idNumber: 'PER-112233', emergencyContact: 'Anna Moreau', emergencyPhone: '05 66 77 88 99', notes: '', createdAt: '2025-10-01' },
    { id: 'ten_awa', firstName: 'Awa', lastName: 'Diallo', phone: '07 77 88 99 00', email: 'awa.diallo@email.com', address: 'Rue 12, Cocody', idType: 'CNI', idNumber: 'CI-77889900', emergencyContact: 'Moussa Diallo', emergencyPhone: '05 12 12 12 12', notes: 'Ancienne locataire A01 (partie en juin 2026).', createdAt: '2024-06-01' },
  ],
  contracts: [
    { id: 'ct_001', reference: 'CT0001', propertyId: 'prop_a03', tenantId: 'ten_jean', startDate: '2025-01-01', endDate: '2027-12-31', monthlyRent: 500000, charges: 50000, depositAmount: 500000, dueDay: 5, conditions: 'Loyer payable avant le 5 de chaque mois.', status: 'actif', createdAt: '2025-01-01' },
    { id: 'ct_002', reference: 'CT0002', propertyId: 'prop_b02', tenantId: 'ten_marie', startDate: '2025-02-15', endDate: '2026-02-14', monthlyRent: 270000, charges: 15000, depositAmount: 270000, dueDay: 10, conditions: '', status: 'actif', createdAt: '2025-02-15' },
    { id: 'ct_003', reference: 'CT0003', propertyId: 'prop_c01', tenantId: 'ten_thomas', startDate: '2025-01-01', endDate: '2026-12-31', monthlyRent: 600000, charges: 20000, depositAmount: 600000, dueDay: 5, conditions: '', status: 'actif', createdAt: '2025-01-01' },
    { id: 'ct_004', reference: 'CT0004', propertyId: 'prop_a02', tenantId: 'ten_sophie', startDate: '2025-05-06', endDate: '2027-05-05', monthlyRent: 400000, charges: 25000, depositAmount: 400000, dueDay: 5, conditions: '', status: 'actif', createdAt: '2025-05-06' },
    { id: 'ct_005', reference: 'CT0005', propertyId: 'prop_b01', tenantId: 'ten_lucas', startDate: '2025-10-10', endDate: '2026-10-09', monthlyRent: 250000, charges: 15000, depositAmount: 250000, dueDay: 10, conditions: '', status: 'actif', createdAt: '2025-10-10' },
    { id: 'ct_006', reference: 'CT0006', propertyId: 'prop_a01', tenantId: 'ten_awa', startDate: '2024-06-01', endDate: '2026-05-31', monthlyRent: 450000, charges: 30000, depositAmount: 450000, dueDay: 5, conditions: '', status: 'expire', createdAt: '2024-06-01' },
    { id: 'ct_007', reference: 'CT0007', propertyId: 'prop_a01', tenantId: 'ten_jean', startDate: '2026-11-01', endDate: '2027-10-31', monthlyRent: 450000, charges: 30000, depositAmount: 450000, dueDay: 5, conditions: 'Contrat à venir — test.', status: 'a_venir', createdAt: '2026-10-10' },
  ],
  rentSchedules: [
    // Jean A03 — 500k — Jan à Déc 2026
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({ id: `rs_j_${m}`, contractId: 'ct_001', month: m, year: 2026, amountDue: 500000, createdAt: '2026-01-01' })),
    // Marie B02 — 270k
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({ id: `rs_m_${m}`, contractId: 'ct_002', month: m, year: 2026, amountDue: 270000, createdAt: '2026-01-01' })),
    // Thomas C01 — 600k
    ...[1,2,3,4,5,6,7,8,9,10].map(m => ({ id: `rs_t_${m}`, contractId: 'ct_003', month: m, year: 2026, amountDue: 600000, createdAt: '2026-01-01' })),
    // Sophie A02 — 400k (Sophie a commencé mai 2025, on génère 2026)
    ...[1,2,3,4,5,6,7,8,9,10].map(m => ({ id: `rs_s_${m}`, contractId: 'ct_004', month: m, year: 2026, amountDue: 400000, createdAt: '2026-01-01' })),
    // Lucas B01 — 250k depuis oct 2025, on génère 2026 jan-oct
    ...[1,2,3,4,5,6,7,8,9,10].map(m => ({ id: `rs_l_${m}`, contractId: 'ct_005', month: m, year: 2026, amountDue: 250000, createdAt: '2026-01-01' })),
  ],
  waterMeters: [
    { id: 'wm_a01', propertyId: 'prop_a01', meterNumber: 'EA-001', installationDate: '2024-01-15', status: 'actif', createdAt: '2024-01-15' },
    { id: 'wm_a02', propertyId: 'prop_a02', meterNumber: 'EA-002', installationDate: '2024-01-15', status: 'actif', createdAt: '2024-01-15' },
    { id: 'wm_a03', propertyId: 'prop_a03', meterNumber: 'EA-003', installationDate: '2024-01-15', status: 'actif', readingDay: 22, createdAt: '2024-01-15' },
    { id: 'wm_b01', propertyId: 'prop_b01', meterNumber: 'EA-004', installationDate: '2024-02-01', status: 'actif', createdAt: '2024-02-01' },
    { id: 'wm_b02', propertyId: 'prop_b02', meterNumber: 'EA-005', installationDate: '2024-02-01', status: 'actif', createdAt: '2024-02-01' },
    { id: 'wm_c01', propertyId: 'prop_c01', meterNumber: 'EA-006', installationDate: '2024-03-01', status: 'actif', createdAt: '2024-03-01' },
  ],
  waterReadings: [
    { id: 'wr_j_8', meterId: 'wm_a03', readingDate: '2026-08-31', previousReading: 112, currentReading: 125, consumption: 13, tariffPerM3: 500, periodMonth: 8, periodYear: 2026, createdAt: '2026-08-31' },
    { id: 'wr_j_9', meterId: 'wm_a03', readingDate: '2026-09-30', previousReading: 125, currentReading: 138, consumption: 13, tariffPerM3: 500, periodMonth: 9, periodYear: 2026, createdAt: '2026-09-30' },
    { id: 'wr_j_10', meterId: 'wm_a03', readingDate: '2026-10-18', previousReading: 138, currentReading: 151, consumption: 13, tariffPerM3: 500, periodMonth: 10, periodYear: 2026, createdAt: '2026-10-18' },
    { id: 'wr_m_9', meterId: 'wm_b02', readingDate: '2026-09-30', previousReading: 80, currentReading: 95, consumption: 15, tariffPerM3: 500, periodMonth: 9, periodYear: 2026, createdAt: '2026-09-30' },
    { id: 'wr_t_9', meterId: 'wm_c01', readingDate: '2026-09-30', previousReading: 200, currentReading: 210, consumption: 10, tariffPerM3: 500, periodMonth: 9, periodYear: 2026, createdAt: '2026-09-30' },
    { id: 'wr_s_9', meterId: 'wm_a02', readingDate: '2026-09-30', previousReading: 60, currentReading: 71, consumption: 11, tariffPerM3: 500, periodMonth: 9, periodYear: 2026, createdAt: '2026-09-30' },
    { id: 'wr_l_9', meterId: 'wm_b01', readingDate: '2026-09-30', previousReading: 40, currentReading: 48, consumption: 8, tariffPerM3: 500, periodMonth: 9, periodYear: 2026, createdAt: '2026-09-30' },
  ],
  waterInvoices: [
    { id: 'wi_j_8', contractId: 'ct_001', meterId: 'wm_a03', readingId: 'wr_j_8', periodMonth: 8, periodYear: 2026, previousIndex: 112, currentIndex: 125, consumption: 13, tariffPerM3: 500, amountDue: 6500, createdAt: '2026-08-31' },
    { id: 'wi_j_9', contractId: 'ct_001', meterId: 'wm_a03', readingId: 'wr_j_9', periodMonth: 9, periodYear: 2026, previousIndex: 125, currentIndex: 138, consumption: 13, tariffPerM3: 500, amountDue: 6500, createdAt: '2026-09-30' },
    { id: 'wi_j_10', contractId: 'ct_001', meterId: 'wm_a03', readingId: 'wr_j_10', periodMonth: 10, periodYear: 2026, previousIndex: 138, currentIndex: 151, consumption: 13, tariffPerM3: 500, amountDue: 6500, createdAt: '2026-10-18' },
    { id: 'wi_m_9', contractId: 'ct_002', meterId: 'wm_b02', readingId: 'wr_m_9', periodMonth: 9, periodYear: 2026, previousIndex: 80, currentIndex: 95, consumption: 15, tariffPerM3: 500, amountDue: 7500, createdAt: '2026-09-30' },
    { id: 'wi_t_9', contractId: 'ct_003', meterId: 'wm_c01', readingId: 'wr_t_9', periodMonth: 9, periodYear: 2026, previousIndex: 200, currentIndex: 210, consumption: 10, tariffPerM3: 500, amountDue: 5000, createdAt: '2026-09-30' },
    { id: 'wi_s_9', contractId: 'ct_004', meterId: 'wm_a02', readingId: 'wr_s_9', periodMonth: 9, periodYear: 2026, previousIndex: 60, currentIndex: 71, consumption: 11, tariffPerM3: 500, amountDue: 5500, createdAt: '2026-09-30' },
    { id: 'wi_l_9', contractId: 'ct_005', meterId: 'wm_b01', readingId: 'wr_l_9', periodMonth: 9, periodYear: 2026, previousIndex: 40, currentIndex: 48, consumption: 8, tariffPerM3: 500, amountDue: 4000, createdAt: '2026-09-30' },
    // anciennes factures tarif 450
    { id: 'wi_j_6', contractId: 'ct_001', meterId: 'wm_a03', periodMonth: 6, periodYear: 2026, previousIndex: 88, currentIndex: 100, consumption: 12, tariffPerM3: 450, amountDue: 5400, createdAt: '2026-06-30' },
    { id: 'wi_j_7', contractId: 'ct_001', meterId: 'wm_a03', periodMonth: 7, periodYear: 2026, previousIndex: 100, currentIndex: 112, consumption: 12, tariffPerM3: 450, amountDue: 5400, createdAt: '2026-07-31' },
  ],
  payments: [
    { id: 'pay_001', reference: 'PAY-2026-001', tenantId: 'ten_jean', contractId: 'ct_001', propertyId: 'prop_a03', paymentDate: '2026-10-03', amount: 450000, method: 'virement', kind: 'mixte', comment: 'Loyer Oct-Déc partiel + eau', createdAt: '2026-10-03' },
    { id: 'pay_002', reference: 'PAY-2026-002', tenantId: 'ten_marie', contractId: 'ct_002', propertyId: 'prop_b02', paymentDate: '2026-10-01', amount: 270000, method: 'especes', kind: 'loyer', comment: 'Octobre', createdAt: '2026-10-01' },
    { id: 'pay_003', reference: 'PAY-2026-003', tenantId: 'ten_sophie', contractId: 'ct_004', propertyId: 'prop_a02', paymentDate: '2026-09-20', amount: 500000, method: 'virement', kind: 'loyer', comment: 'Septembre + avance', createdAt: '2026-09-20' },
    { id: 'pay_004', reference: 'PAY-2026-004', tenantId: 'ten_thomas', contractId: 'ct_003', propertyId: 'prop_c01', paymentDate: '2026-09-28', amount: 600000, method: 'cheque', kind: 'loyer', comment: 'Septembre', createdAt: '2026-09-28' },
    { id: 'pay_005', reference: 'PAY-2026-005', tenantId: 'ten_lucas', contractId: 'ct_005', propertyId: 'prop_b01', paymentDate: '2026-09-15', amount: 300000, method: 'mobile_money', kind: 'mixte', comment: 'Août-Septembre', createdAt: '2026-09-15' },
    { id: 'pay_006', reference: 'PAY-2026-006', tenantId: 'ten_jean', contractId: 'ct_001', propertyId: 'prop_a03', paymentDate: '2026-09-05', amount: 506500, method: 'virement', kind: 'mixte', comment: 'Septembre loyer + eau août', createdAt: '2026-09-05' },
  ],
  allocations: [
    // pay_006: sept loyer 500k + eau août 6500
    { id: 'al_006_1', paymentId: 'pay_006', rentScheduleId: 'rs_j_9', allocatedAmount: 500000, createdAt: '2026-09-05' },
    { id: 'al_006_2', paymentId: 'pay_006', waterInvoiceId: 'wi_j_8', allocatedAmount: 6500, createdAt: '2026-09-05' },
    // pay_001: 450k -> oct 150k? Non loyer 500k. Exemple: pour démo, oct payé partiel? Faisons: oct 400k incomplet + eau sept 6500 + reste? 450k = 400k loyer oct + 6500 eau? Reste 43500 non affecté? Simplifions: oct 443500 incomplet + eau sept 6500
    { id: 'al_001_1', paymentId: 'pay_001', rentScheduleId: 'rs_j_10', allocatedAmount: 443500, createdAt: '2026-10-03' },
    { id: 'al_001_2', paymentId: 'pay_001', waterInvoiceId: 'wi_j_9', allocatedAmount: 6500, createdAt: '2026-10-03' },
    // marie oct payé
    { id: 'al_002_1', paymentId: 'pay_002', rentScheduleId: 'rs_m_10', allocatedAmount: 270000, createdAt: '2026-10-01' },
    // sophie sept 400k + avance? affectons sept 400k + oct 100k incomplet
    { id: 'al_003_1', paymentId: 'pay_003', rentScheduleId: 'rs_s_9', allocatedAmount: 400000, createdAt: '2026-09-20' },
    { id: 'al_003_2', paymentId: 'pay_003', rentScheduleId: 'rs_s_10', allocatedAmount: 100000, createdAt: '2026-09-20' },
    // thomas sept payé
    { id: 'al_004_1', paymentId: 'pay_004', rentScheduleId: 'rs_t_9', allocatedAmount: 600000, createdAt: '2026-09-28' },
    // lucas: sept 250k payé + août 50k incomplet (août dû 250k, reste)
    { id: 'al_005_1', paymentId: 'pay_005', rentScheduleId: 'rs_l_9', allocatedAmount: 250000, createdAt: '2026-09-15' },
    { id: 'al_005_2', paymentId: 'pay_005', rentScheduleId: 'rs_l_8', allocatedAmount: 50000, createdAt: '2026-09-15' },
    // Historique: Jean jan-août payés (simulés par allocations sans paiements détaillés? ajoutons paiements fictifs agrégés)
    { id: 'al_h_j1', paymentId: 'pay_006', rentScheduleId: 'rs_j_8', allocatedAmount: 0, createdAt: '2026-09-05' },
  ],
  waterTariffs: [
    { id: 'wt_1', pricePerM3: 400, effectiveFrom: '2024-01-01', effectiveTo: '2024-12-31', createdAt: '2024-01-01' },
    { id: 'wt_2', pricePerM3: 450, effectiveFrom: '2025-01-01', effectiveTo: '2026-07-31', createdAt: '2025-01-01' },
    { id: 'wt_3', pricePerM3: 500, effectiveFrom: '2026-08-01', createdAt: '2026-08-01' },
  ],
  maintenances: [
    { id: 'mnt_1', propertyId: 'prop_a03', title: 'Fuite robinet cuisine', description: 'Fuite au niveau du robinet de la cuisine, joint à remplacer.', priority: 'moyenne', cost: 15000, provider: 'Plomberie Koné', status: 'termine', reportedAt: '2026-09-01', completedAt: '2026-09-03', notes: '' },
    { id: 'mnt_2', propertyId: 'prop_b02', title: 'Problème d\'électricité', description: 'Coupures intermittentes dans le studio.', priority: 'haute', cost: 45000, provider: 'Élec Pro', status: 'en_cours', reportedAt: '2026-09-26', notes: 'Devis validé' },
    { id: 'mnt_3', propertyId: 'prop_c01', title: 'Robinet cassé', description: 'Robinet extérieur cassé.', priority: 'moyenne', cost: 80000, provider: '', status: 'signale', reportedAt: '2026-09-26', notes: '' },
    { id: 'mnt_4', propertyId: 'prop_a02', title: 'Chauffe-eau', description: 'Chauffe-eau ne chauffe plus.', priority: 'haute', cost: 200000, provider: 'SAV Atlantic', status: 'en_cours', reportedAt: '2026-10-15', notes: '' },
    { id: 'mnt_5', propertyId: 'prop_b01', title: 'Porte qui ferme mal', description: 'Serrure à ajuster.', priority: 'basse', cost: 50000, provider: '', status: 'signale', reportedAt: '2026-10-10', notes: '' },
  ],
  documents: [
    { id: 'doc_1', name: 'Contrat_Jean_Dupont.pdf', type: 'contrat', tenantId: 'ten_jean', contractId: 'ct_001', propertyId: 'prop_a03', filePath: 'C:\\GestionLocative\\docs\\Contrat_Jean_Dupont.pdf', size: '245 Ko', createdAt: '2025-01-01' },
    { id: 'doc_2', name: 'Piece_Marie_Martin.pdf', type: 'piece', tenantId: 'ten_marie', filePath: 'C:\\GestionLocative\\docs\\Piece_Marie.pdf', size: '180 Ko', createdAt: '2025-02-15' },
    { id: 'doc_3', name: 'Etat_lieux_A03.pdf', type: 'etat_lieux', propertyId: 'prop_a03', contractId: 'ct_001', filePath: 'C:\\GestionLocative\\docs\\Etat_lieux_A03.pdf', size: '320 Ko', createdAt: '2025-01-02' },
    { id: 'doc_4', name: 'Quittance_Sept_Jean.pdf', type: 'recu', tenantId: 'ten_jean', paymentId: 'pay_006', filePath: 'C:\\GestionLocative\\recus\\Quittance_Sept.pdf', size: '95 Ko', createdAt: '2026-09-05' },
    { id: 'doc_5', name: 'Contrat_Thomas_Bernard.pdf', type: 'contrat', tenantId: 'ten_thomas', contractId: 'ct_003', filePath: 'C:\\GestionLocative\\docs\\Contrat_Thomas.pdf', size: '250 Ko', createdAt: '2025-01-01' },
  ],
  auditLog: [],
  settings: {
    landlordName: 'Bailleur Démo',
    company: 'SCI Les Palmiers',
    phone: '+225 07 00 00 00 00',
    email: 'contact@scipalmiers.ci',
    address: 'Abidjan, Cocody, Rue 12',
    currency: 'F',
    receiptHeader: 'SCI LES PALMIERS — Gestion Locative',
    receiptFooter: 'Merci de votre confiance. Paiement reçu sous réserve d\'encaissement.',
    dueDayDefault: 5,
    lastBackup: '2026-10-15T10:30:00',
    backupFolder: 'C:\\GestionLocative\\backups',
    soundEnabled: true,
    soundVolume: 0.6,
    soundOnAlerts: true,
    soundOnPayment: true,
    soundOnClick: false,
    autoBackupEnabled: true,
    autoBackupIntervalMinutes: 5,
    lastAutoBackup: '2026-10-19T08:00:00',
    autoBackupCount: 12,
    waterReadingDay: 25,
    rentLateGraceDays: 0,
    alertRentDaysBefore: 3,
  },
};
