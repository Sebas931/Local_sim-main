"""
Servicio para extraer códigos QR de archivos PDF
Diseñado para procesar PDFs con múltiples eSIMs
"""

import io
import base64
from typing import List, Dict, Optional, Tuple
from PIL import Image
import fitz  # PyMuPDF
from pyzbar.pyzbar import decode as decode_qr
import logging

logger = logging.getLogger(__name__)


class QRExtractor:
    """Extractor de códigos QR desde archivos PDF"""

    def __init__(self, dpi: int = 300):
        """
        Args:
            dpi: Resolución para convertir PDF a imagen (mayor = mejor calidad)
        """
        self.dpi = dpi

    def extract_qrs_from_pdf(self, pdf_bytes: bytes) -> List[Dict[str, any]]:
        """
        Extrae todos los códigos QR de un PDF

        Args:
            pdf_bytes: Contenido del archivo PDF en bytes

        Returns:
            Lista de diccionarios con información de cada QR encontrado:
            [
                {
                    'qr_data': 'contenido del QR',
                    'qr_image_base64': 'imagen del QR en base64',
                    'page': número de página,
                    'position': posición en la página
                }
            ]
        """
        qr_codes = []

        try:
            # Abrir PDF desde bytes
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            logger.info(f"PDF abierto: {pdf_document.page_count} páginas")

            # Procesar cada página
            for page_num in range(pdf_document.page_count):
                page = pdf_document[page_num]
                logger.info(f"Procesando página {page_num + 1}")

                # Convertir página a imagen de alta resolución
                zoom = self.dpi / 72  # 72 DPI es la base de PDF
                matrix = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=matrix)

                # Convertir a PIL Image
                img_data = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_data))

                # Buscar QR codes en la imagen
                decoded_objects = decode_qr(image)

                logger.info(f"QRs encontrados en página {page_num + 1}: {len(decoded_objects)}")

                # Procesar cada QR encontrado
                for idx, obj in enumerate(decoded_objects):
                    qr_data = obj.data.decode('utf-8')

                    # Extraer la imagen del QR específico
                    x, y, w, h = obj.rect.left, obj.rect.top, obj.rect.width, obj.rect.height

                    # Agregar margen para capturar el QR completo
                    margin = 20
                    x = max(0, x - margin)
                    y = max(0, y - margin)
                    w = w + 2 * margin
                    h = h + 2 * margin

                    # Recortar imagen del QR
                    qr_image = image.crop((x, y, x + w, y + h))

                    # Convertir a base64
                    buffered = io.BytesIO()
                    qr_image.save(buffered, format="PNG")
                    qr_image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

                    qr_codes.append({
                        'qr_data': qr_data,
                        'qr_image_base64': f"data:image/png;base64,{qr_image_base64}",
                        'page': page_num + 1,
                        'position': idx + 1
                    })

                    logger.info(f"QR extraído: página {page_num + 1}, posición {idx + 1}")

            pdf_document.close()
            logger.info(f"Total QRs extraídos: {len(qr_codes)}")

        except Exception as e:
            logger.error(f"Error extrayendo QRs del PDF: {str(e)}")
            raise

        return qr_codes

    def extract_qrs_simple(self, pdf_bytes: bytes) -> List[str]:
        """
        Versión simplificada que solo retorna los datos de los QR (sin imágenes)

        Args:
            pdf_bytes: Contenido del archivo PDF en bytes

        Returns:
            Lista de strings con el contenido de cada QR
        """
        qr_data_list = []

        try:
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")

            for page_num in range(pdf_document.page_count):
                page = pdf_document[page_num]

                zoom = self.dpi / 72
                matrix = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=matrix)

                img_data = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_data))

                decoded_objects = decode_qr(image)

                for obj in decoded_objects:
                    qr_data = obj.data.decode('utf-8')
                    qr_data_list.append(qr_data)

            pdf_document.close()

        except Exception as e:
            logger.error(f"Error extrayendo QRs (simple): {str(e)}")
            raise

        return qr_data_list

    def validate_qr_format(self, qr_data: str) -> Tuple[bool, Optional[str]]:
        """
        Valida que el QR tenga un formato esperado para eSIM

        Args:
            qr_data: Contenido del QR

        Returns:
            Tupla (es_valido, mensaje_error)
        """
        # Los QR de eSIM típicamente empiezan con "LPA:" (GSMA formato)
        if not qr_data:
            return False, "QR vacío"

        # Validar formato LPA (formato estándar eSIM)
        if qr_data.startswith("LPA:"):
            return True, None

        # Validar si es una URL (algunos proveedores usan URLs)
        if qr_data.startswith("http://") or qr_data.startswith("https://"):
            return True, None

        # Si no reconocemos el formato, advertir pero no rechazar
        logger.warning(f"Formato de QR no reconocido: {qr_data[:50]}...")
        return True, "Formato no estándar, verificar manualmente"


# Función helper para uso rápido
async def extract_qrs_from_uploaded_pdf(file_content: bytes) -> List[Dict[str, any]]:
    """
    Función de conveniencia para extraer QRs de un PDF subido

    Args:
        file_content: Contenido del archivo PDF

    Returns:
        Lista de QRs extraídos con metadata
    """
    extractor = QRExtractor(dpi=300)
    qr_codes = extractor.extract_qrs_from_pdf(file_content)

    # Validar cada QR
    for qr in qr_codes:
        is_valid, error_msg = extractor.validate_qr_format(qr['qr_data'])
        qr['is_valid'] = is_valid
        qr['validation_message'] = error_msg

    return qr_codes
