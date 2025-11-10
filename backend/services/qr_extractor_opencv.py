"""
Servicio para extraer códigos QR de archivos PDF
Versión compatible con Windows usando OpenCV (no requiere zbar)
"""

import io
import base64
from typing import List, Dict, Optional, Tuple
from PIL import Image
import fitz  # PyMuPDF
import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)


class QRExtractor:
    """Extractor de códigos QR desde archivos PDF usando OpenCV"""

    def __init__(self, dpi: int = 300):
        """
        Args:
            dpi: Resolución para convertir PDF a imagen (mayor = mejor calidad)
        """
        self.dpi = dpi
        # Inicializar detector de QR de OpenCV
        self.qr_detector = cv2.QRCodeDetector()

    def extract_qrs_from_pdf(self, pdf_bytes: bytes) -> List[Dict[str, any]]:
        """
        Extrae todos los códigos QR de un PDF usando OpenCV

        Args:
            pdf_bytes: Contenido del archivo PDF en bytes

        Returns:
            Lista de diccionarios con información de cada QR encontrado
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
                pil_image = Image.open(io.BytesIO(img_data))

                # Convertir PIL a numpy array para OpenCV
                img_array = np.array(pil_image)

                # OpenCV espera BGR, PIL da RGB
                if len(img_array.shape) == 3 and img_array.shape[2] == 3:
                    img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                else:
                    img_cv = img_array

                # Detectar y decodificar QRs usando OpenCV
                # Intentar con la imagen original
                qr_data, bbox, straight_qrcode = self.qr_detector.detectAndDecode(img_cv)

                found_qrs = []

                if qr_data:
                    found_qrs.append({
                        'data': qr_data,
                        'bbox': bbox,
                        'position': 0
                    })

                # También intentar detectar múltiples QRs
                try:
                    # Crear detector de QR multi
                    detector = cv2.QRCodeDetector()

                    # Detectar todos los QRs en la imagen
                    retval, decoded_info, points, straight_qrcode = detector.detectAndDecodeMulti(img_cv)

                    if retval:
                        for idx, (data, pts) in enumerate(zip(decoded_info, points)):
                            if data:  # Solo si hay datos
                                # Verificar que no sea duplicado
                                if data not in [qr['data'] for qr in found_qrs]:
                                    found_qrs.append({
                                        'data': data,
                                        'bbox': pts,
                                        'position': idx
                                    })
                except Exception as multi_error:
                    logger.warning(f"Error detectando múltiples QRs: {multi_error}")

                logger.info(f"QRs encontrados en página {page_num + 1}: {len(found_qrs)}")

                # Procesar cada QR encontrado
                for idx, qr_info in enumerate(found_qrs):
                    qr_data = qr_info['data']
                    bbox = qr_info['bbox']

                    # Extraer la región del QR de la imagen PIL original
                    try:
                        if bbox is not None and len(bbox) > 0:
                            # Calcular bounding box
                            x_coords = [int(p[0]) for p in bbox]
                            y_coords = [int(p[1]) for p in bbox]

                            x_min, x_max = max(0, min(x_coords) - 20), min(pil_image.width, max(x_coords) + 20)
                            y_min, y_max = max(0, min(y_coords) - 20), min(pil_image.height, max(y_coords) + 20)

                            # Recortar imagen del QR
                            qr_image = pil_image.crop((x_min, y_min, x_max, y_max))
                        else:
                            # Si no hay bbox, usar toda la imagen
                            qr_image = pil_image

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

                    except Exception as crop_error:
                        logger.warning(f"Error recortando QR: {crop_error}")
                        # Agregar sin imagen si falla
                        qr_codes.append({
                            'qr_data': qr_data,
                            'qr_image_base64': None,
                            'page': page_num + 1,
                            'position': idx + 1
                        })

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
                pil_image = Image.open(io.BytesIO(img_data))

                # Convertir a OpenCV
                img_array = np.array(pil_image)
                if len(img_array.shape) == 3 and img_array.shape[2] == 3:
                    img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                else:
                    img_cv = img_array

                # Detectar QR
                qr_data, _, _ = self.qr_detector.detectAndDecode(img_cv)
                if qr_data:
                    qr_data_list.append(qr_data)

                # Intentar detectar múltiples
                try:
                    retval, decoded_info, points, _ = self.qr_detector.detectAndDecodeMulti(img_cv)
                    if retval:
                        for data in decoded_info:
                            if data and data not in qr_data_list:
                                qr_data_list.append(data)
                except:
                    pass

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
        if not qr_data:
            return False, "QR vacío"

        # Validar formato LPA (formato estándar eSIM)
        if qr_data.startswith("LPA:"):
            return True, None

        # Validar si es una URL
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
