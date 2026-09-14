// Planillas de prueba: las formas reales que puede tener la tabla de un cliente.
//
// Ritto no lee "una planilla", lee la planilla que cada uno armó a su manera. Todos los
// bugs que encontramos salieron de la forma de una tabla concreta, y mientras la única
// tabla de prueba fue la de casa, cada cliente nuevo era una ruleta.
//
// Cada entrada de acá es una pestaña entera tal como vuelve de la API de Sheets: una
// matriz de filas, la fila 1 es `celdas[0]`. Las fórmulas se escriben como "=..." igual
// que las devuelve la API con valueRenderOption=FORMULA.
//
// Para agregar una forma nueva: copiala acá y escribí el test que dice qué tendría que
// deducir Ritto. Si falla, ya tenés el parche localizado.

export type Planilla = {
  nombre: string;
  // Qué tiene de particular, para que el test que falle se explique solo.
  particularidad: string;
  celdas: (string | number)[][];
  // Lo que Ritto tendría que deducir.
  esperado: {
    filaEncabezado: number;
    // Encabezados sin las columnas fantasma (las que no tienen título).
    columnas: string[];
    // Columnas que Ritto NO puede pisar porque las calcula la planilla.
    conFormula: string[];
  };
};

export const PLANILLAS: Planilla[] = [
  {
    nombre: 'clasica',
    particularidad: 'Encabezado en la fila 1, datos abajo, total al final. El caso de manual.',
    celdas: [
      ['Fecha', 'Factura', 'Proveedor', 'Costo', 'Deuda'],
      ['6/8/2026', 'A-1', 'El Trigal', 12000, '=IF(F2="no pago",D2,0)'],
      ['19/8/2026', 'A-2', 'El Trigal', 17964, '=IF(F3="no pago",D3,0)'],
      ['', '', 'TOTAL', '=SUM(D2:D3)', ''],
    ],
    esperado: {
      filaEncabezado: 1,
      columnas: ['Fecha', 'Factura', 'Proveedor', 'Costo', 'Deuda'],
      // Costo aparece acá porque la suma del final es una fórmula en esa columna. Es
      // justo el caso que dejaba las facturas sin importe: la columna figura como
      // calculada, pero la celda de cada factura la llena el usuario.
      conFormula: ['Costo', 'Deuda'],
    },
  },
  {
    nombre: 'titulo-arriba',
    particularidad: 'Título del mes en la fila 1 y el encabezado real en la 3.',
    celdas: [
      ['GASTOS AGOSTO 2026', '', '', ''],
      ['', '', '', ''],
      ['Fecha', 'Comprobante', 'Detalle', 'Importe'],
      ['6/8/2026', 'A-1', 'Mercadería', 12000],
    ],
    esperado: {
      filaEncabezado: 3,
      columnas: ['Fecha', 'Comprobante', 'Detalle', 'Importe'],
      conFormula: [],
    },
  },
  {
    nombre: 'columna-separadora',
    particularidad: 'Una columna sin título en el medio, usada como separador visual.',
    celdas: [
      ['Fecha', 'Factura', '', 'Costo'],
      ['6/8/2026', 'A-1', '', 12000],
    ],
    esperado: {
      filaEncabezado: 1,
      columnas: ['Fecha', 'Factura', 'Costo'],
      conFormula: [],
    },
  },
  {
    nombre: 'descendente',
    particularidad: 'La más nueva arriba. Muchos contadores la llevan así.',
    celdas: [
      ['Fecha', 'Factura', 'Costo'],
      ['19/8/2026', 'A-2', 17964],
      ['10/8/2026', 'A-1', 12000],
      ['6/8/2026', 'A-0', 8000],
    ],
    esperado: {
      filaEncabezado: 1,
      columnas: ['Fecha', 'Factura', 'Costo'],
      conFormula: [],
    },
  },
  {
    nombre: 'mes-vacio',
    particularidad: 'Pestaña de un mes que recién arranca: encabezado y nada más.',
    celdas: [
      ['Fecha', 'Factura', 'Costo'],
      ['', '', ''],
      ['', '', ''],
    ],
    esperado: {
      filaEncabezado: 1,
      columnas: ['Fecha', 'Factura', 'Costo'],
      conFormula: [],
    },
  },
  {
    nombre: 'total-arriba',
    particularidad: 'El total va arriba del detalle, no abajo.',
    celdas: [
      ['TOTAL DEL MES', '=SUM(C4:C6)', ''],
      ['', '', ''],
      ['Fecha', 'Proveedor', 'Importe'],
      ['6/8/2026', 'El Trigal', 12000],
      ['19/8/2026', 'El Trigal', 17964],
    ],
    esperado: {
      filaEncabezado: 3,
      columnas: ['Fecha', 'Proveedor', 'Importe'],
      conFormula: [],
    },
  },
  {
    nombre: 'nombres-propios',
    particularidad: 'Columnas con nombres que no usan ninguna palabra contable típica.',
    celdas: [
      ['Día', 'Nro', 'Quién', 'Cuánto'],
      ['6/8/2026', 'A-1', 'El Trigal', 12000],
      ['19/8/2026', 'A-2', 'El Trigal', 17964],
    ],
    esperado: {
      filaEncabezado: 1,
      columnas: ['Día', 'Nro', 'Quién', 'Cuánto'],
      conFormula: [],
    },
  },
  {
    nombre: 'simbolo-moneda',
    particularidad: 'La columna de plata se llama con el símbolo en vez de una palabra.',
    celdas: [
      ['Fecha', 'Factura', '$'],
      ['6/8/2026', 'A-1', '$12.000,00'],
      ['19/8/2026', 'A-2', '$17.964,00'],
    ],
    esperado: {
      filaEncabezado: 1,
      columnas: ['Fecha', 'Factura', '$'],
      conFormula: [],
    },
  },
];

// Las filas de datos de una planilla, ya sin el encabezado ni lo que haya arriba.
export function filasDeDatos(p: Planilla): (string | number)[][] {
  return p.celdas.slice(p.esperado.filaEncabezado);
}

// Los valores de una columna, por nombre, desde la primera fila de datos.
export function columna(p: Planilla, nombre: string): (string | number)[] {
  const idx = (p.celdas[p.esperado.filaEncabezado - 1] ?? []).findIndex(
    (c) => String(c).trim() === nombre,
  );
  if (idx < 0) throw new Error(`«${nombre}» no existe en la planilla «${p.nombre}»`);
  return filasDeDatos(p).map((f) => f[idx] ?? '');
}
