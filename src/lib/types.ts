export type InvoiceStatus = 'processing' | 'done' | 'error';
export type InvoiceSource = 'image' | 'pdf' | 'cfe_xml';

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
  error?: string;
}
