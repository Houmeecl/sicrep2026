/**
 * Términos y condiciones de la preinscripción, versionados. El texto de una versión publicada
 * NO se edita: un cambio requiere una versión nueva, porque cada consentimiento guarda la versión
 * que la persona aceptó (preinscripciones.acepta_terminos_version).
 */

export const PREINSCRIPCION_TERMINOS_VERSION = "2026-10";

export interface Seccion {
  titulo: string;
  parrafos: string[];
}

export const TERMINOS: Record<string, { vigenteDesde: string; secciones: Seccion[] }> = {
  "2026-10": {
    vigenteDesde: "Octubre de 2026",
    secciones: [
      {
        titulo: "1. Qué es la preinscripción",
        parrafos: [
          "La preinscripción reserva el lugar de un contribuyente en la membresía Proveedor Regional, programa de desarrollo de proveedores de la Región de Antofagasta administrado por Fundación Entretodos (RUT 65.279.032-1), con apoyo de la plataforma sicr3p/.",
          "La preinscripción no es un medio de pago, no tiene saldo ni cupo de crédito, y no otorga por sí sola los beneficios de la membresía activa.",
        ],
      },
      {
        titulo: "2. Valor",
        parrafos: [
          "El valor de la preinscripción es de $20.000 (veinte mil pesos chilenos), pagado una sola vez a través de Flow. No hay cobros recurrentes ni automáticos.",
          "Si la verificación de identidad es rechazada después del pago, Proveedor Regional contactará al postulante para gestionar la devolución del monto pagado.",
        ],
      },
      {
        titulo: "3. Verificación de identidad",
        parrafos: [
          "Para emitir la tarjeta se verifica la identidad del contribuyente y de su representante: correo electrónico, RUT, cédula de identidad, inicio de actividades ante el SII y, en personas jurídicas, los poderes del representante y sus beneficiarios finales.",
          "El postulante declara que la información y los documentos entregados son verdaderos, completos y vigentes, y se obliga a informar cualquier cambio. Entregar información falsa es causal de rechazo o de revocación de la tarjeta.",
          "Proveedor Regional puede pedir antecedentes adicionales, observar la postulación o rechazarla.",
        ],
      },
      {
        titulo: "4. Tarjeta de membresía",
        parrafos: [
          "La tarjeta se emite solo cuando el pago está confirmado y la verificación de identidad está aprobada. Es personal e intransferible y tiene la vigencia que se indica en ella.",
          "Su validez se comprueba en línea escaneando el código QR. Proveedor Regional puede revocarla si se incumplen estos términos o si los antecedentes dejan de ser verdaderos; desde ese momento la verificación la mostrará como revocada.",
        ],
      },
      {
        titulo: "5. Datos personales",
        parrafos: [
          "Los datos y documentos se tratan conforme a la Ley N° 19.628 sobre protección de la vida privada, con el único fin de verificar la identidad, administrar la preinscripción y la membresía, y cumplir obligaciones legales.",
          "Los documentos se almacenan de forma restringida y solo los consulta el equipo de verificación. No se ceden a terceros, salvo a los proveedores necesarios para operar el servicio (pago, correo y wallet) o por requerimiento de autoridad competente.",
          "El titular puede ejercer sus derechos de acceso, rectificación, cancelación y oposición escribiendo a soporte@sicr3p.cl.",
        ],
      },
      {
        titulo: "6. Contacto",
        parrafos: ["Consultas y reclamos: soporte@sicr3p.cl · www.sicr3p.cl"],
      },
    ],
  },
};
