export type InvoiceStatus = 'processing' | 'done' | 'error';
export type InvoiceSource = 'image' | 'pdf' | 'cfe_xml';

export interface ExcelColumn {
  id: string;
  label: string;
  field: string;
}

export const RITTO_FIELDS: { value: string; label: string }[] = [
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'rut', label: 'RUT' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'nroDocumento', label: 'Nro. de documento' },
  { value: 'tipoDocumento', label: 'Tipo de comprobante' },
  { value: 'moneda', label: 'Moneda' },
  { value: 'neto', label: 'Neto (sin IVA)' },
  { value: 'iva10', label: 'IVA 10%' },
  { value: 'iva22', label: 'IVA 22%' },
  { value: 'ivaTotal', label: 'IVA Total' },
  { value: 'total', label: 'Total' },
  { value: 'fileName', label: 'Nombre del archivo' },
];

export const DEFAULT_COLUMNS: ExcelColumn[] = [
  { id: '1', label: 'Proveedor', field: 'proveedor' },
  { id: '2', label: 'RUT', field: 'rut' },
  { id: '3', label: 'Fecha', field: 'fecha' },
  { id: '4', label: 'Nro. Documento', field: 'nroDocumento' },
  { id: '5', label: 'Tipo', field: 'tipoDocumento' },
  { id: '6', label: 'Moneda', field: 'moneda' },
  { id: '7', label: 'Neto', field: 'neto' },
  { id: '8', label: 'IVA Total', field: 'ivaTotal' },
  { id: '9', label: 'Total', field: 'total' },
];

export interface InvoiceItem {
  codigo?: string;
  descripcion?: string;
  cantidad?: number;
  precioUnitario?: number;
  descuento?: number;
  impuesto?: number;
  subtotal?: number;
  totalItem?: number;
}

export interface ExtractedInvoice {
  id: string;
  fileName: string;
  source: InvoiceSource;
  status: InvoiceStatus;
  proveedor?: string;
  rut?: string;
  fecha?: string;
  nroDocumento?: string;
  tipoDocumento?: string;
  moneda?: string;
  neto?: number;
  iva10?: number;
  iva22?: number;
  ivaTotal?: number;
  total?: number;
  items?: InvoiceItem[];
  error?: string;
  warning?: string;
}

export function isCreditNote(tipoDocumento?: string): boolean {
  return !!(tipoDocumento && /cr[eé]dito/i.test(tipoDocumento));
}
