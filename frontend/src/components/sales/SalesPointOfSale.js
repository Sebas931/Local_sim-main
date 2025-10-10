import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ShoppingCart, Search, Plus, Minus, X, Scan } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { salesService } from '../../services/salesService';
import { productsService } from '../../services/productsService';
import { simsService } from '../../services/simsService';
import { useApp } from '../../context/AppContext';

const SalesPointOfSale = () => {
  const { showNotification, turnoAbierto } = useApp();

  // Products and inventory
  const [products, setProducts] = useState([]);
  const [sims, setSims] = useState([]);
  const [cart, setCart] = useState([]);
  const [loadingSims, setLoadingSims] = useState(false);

  // Search and selection
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSim, setSelectedSim] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('electronic');
  const [loading, setLoading] = useState(false);

  // Referencias
  const barcodeInputRef = useRef(null);
  const cartRef = useRef(cart);
  const handleBarcodeRef = useRef(null);

  // Estado para el escáner global
  const [globalScanBuffer, setGlobalScanBuffer] = useState('');
  const scanTimeoutRef = useRef(null);

  // Mantener cartRef actualizado
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Available plans for SIMs
  const availablePlans = [
    '5GB x $15K',
    '10GB x $25K',
    '20GB x $40K',
    '50GB x $75K',
    'Unlimited x $100K'
  ];

  useEffect(() => {
    fetchProducts();
    fetchSims();
  }, []);

  // Helper functions
  const findProductByCode = (code) => {
    return (products || []).find(p =>
      String(p.code).trim().toUpperCase() === String(code || "").trim().toUpperCase()
    ) || null;
  };

  const findSimByIccid = (iccid) => {
    return (sims || []).find(sim =>
      String(sim.iccid).trim().toUpperCase() === String(iccid || "").trim().toUpperCase()
    ) || null;
  };

  // Función principal del escáner - debe estar antes del useEffect global
  const handleBarcodeOrIccid = useCallback((code) => {
    if (!code) return;

    const scanId = Date.now();
    console.log(`=== INICIO ESCANEO ${scanId} ===`);
    console.log('Escáner: ICCID ingresado:', code);

    // Buscar SIM por ICCID (funcionalidad principal)
    const sim = findSimByIccid(code);
    console.log('SIM encontrada:', sim);

    if (sim) {
      if (String(sim.estado).toLowerCase() === 'sold' || sim.vendida === true) {
        showNotification('Esta SIM ya está vendida', 'error');
        return;
      }

      // Verificar duplicados usando cartRef para obtener el estado más actualizado
      setCart(() => {
        const currentCart = cartRef.current;
        console.log(`[SCAN ${scanId}] Verificando duplicados - Carrito actual:`, currentCart);

        // Verificar si la SIM ya está en el carrito
        const simAlreadyInCart = currentCart.some(item =>
          item.iccid === sim.iccid || item.sim_id === sim.id
        );

        if (simAlreadyInCart) {
          showNotification(`La SIM ${sim.numero_linea} ya está en el carrito`, 'warning');
          return currentCart; // No cambiar el carrito
        }

        // Agregar automáticamente SIM + Plan al carrito
        console.log('Agregando SIM y plan automáticamente');

        // 1) Producto físico S01 (SIM)
        const simProd = findProductByCode('S01');
        if (!simProd) {
          showNotification('No encontré el producto S01 en la lista de productos', 'error');
          return currentCart;
        }

        // 2) Plan por código Siigo guardado en la SIM (ej. R7D)
        const planCode = (sim.plan_asignado || '').trim();
        if (!planCode) {
          showNotification('La SIM no tiene plan_asignado (código Siigo). Selecciónalo manualmente.', 'error');
          return currentCart;
        }

        const planProd = findProductByCode(planCode);
        if (!planProd) {
          showNotification(`No encontré el producto de plan con código ${planCode} en Siigo`, 'error');
          return currentCart;
        }

        // Obtener precios según método de pago
        const simPriceData = getProductPrice(simProd, paymentMethod);
        const planPriceData = getProductPrice(planProd, paymentMethod);

        // Construir ítems
        const items = [
          {
            product_id: simProd.id,
            product_name: simProd.name,
            product_code: simProd.code,
            quantity: 1,
            unit_price: simPriceData.price,
            currency: simPriceData.currency,
            taxes: simProd.taxes || [],
            tax_included: simProd.tax_included,
            sim_id: sim.id,
            sim_number: sim.numero_linea,
            iccid: sim.iccid,
          },
          {
            product_id: planProd.id,
            product_name: planProd.name,
            product_code: planProd.code,
            quantity: 1,
            unit_price: planPriceData.price,
            currency: planPriceData.currency,
            taxes: planProd.taxes || [],
            tax_included: planProd.tax_included,
            sim_id: sim.id,
            selected_plan: planCode,
          }
        ];

        console.log(`[SCAN ${scanId}] Items a agregar:`, items);
        console.log(`[SCAN ${scanId}] Carrito final:`, [...currentCart, ...items]);
        showNotification(`SIM ${sim.numero_linea} y plan ${planCode} agregados al carrito`, 'success');
        return [...currentCart, ...items];
      });

      return;
    }

    // Fallback: buscar producto por código (funcionalidad secundaria)
    const product = findProductByCode(code);
    if (product) {
      // Verificar duplicados usando cartRef para obtener el estado más actualizado
      setCart(() => {
        const currentCart = cartRef.current;
        console.log(`[SCAN ${scanId}] Verificando duplicados de producto - Carrito actual:`, currentCart);

        // Verificar si el producto ya está en el carrito
        const productAlreadyInCart = currentCart.some(item =>
          item.product_id === product.id && !item.sim_id // Solo productos regulares, no SIMs
        );

        if (productAlreadyInCart) {
          showNotification(`El producto ${product.name} ya está en el carrito`, 'warning');
          return currentCart; // No cambiar el carrito
        }

        const priceData = getProductPrice(product, paymentMethod);
        const item = {
          product_id: product.id,
          product_name: product.name,
          product_code: product.code,
          quantity: 1,
          unit_price: priceData.price,
          currency: priceData.currency,
          taxes: product.taxes || [],
          tax_included: product.tax_included,
        };

        console.log(`[SCAN ${scanId}] Producto a agregar:`, item);
        console.log(`[SCAN ${scanId}] Carrito final:`, [...currentCart, item]);
        showNotification(`Producto ${product.name} agregado al carrito`, 'success');
        return [...currentCart, item];
      });

      return;
    }

    // No se encontró ni SIM ni producto
    showNotification('ICCID o código de producto no encontrado', 'error');
  }, [sims, products, paymentMethod, showNotification]);

  // Mantener la referencia de handleBarcodeOrIccid actualizada
  useEffect(() => {
    handleBarcodeRef.current = handleBarcodeOrIccid;
  }, [handleBarcodeOrIccid]);

  // Enfocar automáticamente el campo del escáner
  useEffect(() => {
    const timer = setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 500); // Pequeño delay para asegurar que el DOM esté listo

    return () => clearTimeout(timer);
  }, []);

  // Escáner global - captura teclas en toda la aplicación
  useEffect(() => {
    const handleGlobalKeyPress = (e) => {
      // Ignorar si el usuario está escribiendo en un input, textarea o elemento editable
      const isTypingInInput =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable ||
        e.target.closest('[contenteditable]');

      // Ignorar si se presionan teclas modificadoras
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      if (e.key === 'Enter' && globalScanBuffer.length > 0 && !isTypingInInput) {
        // Procesar el código escaneado
        console.log('Escáner global detectado:', globalScanBuffer);
        if (handleBarcodeRef.current) {
          handleBarcodeRef.current(globalScanBuffer.trim());
        }
        setGlobalScanBuffer('');

        // Limpiar timeout
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
          scanTimeoutRef.current = null;
        }

        e.preventDefault();
        return;
      }

      // Si no está escribiendo en un campo de texto, capturar la tecla
      if (!isTypingInInput && e.key.length === 1) {
        setGlobalScanBuffer(prev => prev + e.key);

        // Limpiar el buffer después de 100ms si no llega más input
        // (Los escáneres escriben muy rápido, el tipeo manual es más lento)
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }

        scanTimeoutRef.current = setTimeout(() => {
          setGlobalScanBuffer('');
        }, 100);
      }
    };

    // Agregar listener global
    document.addEventListener('keypress', handleGlobalKeyPress);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && globalScanBuffer.length > 0) {
        handleGlobalKeyPress(e);
      }
    });

    // Cleanup
    return () => {
      document.removeEventListener('keypress', handleGlobalKeyPress);
      document.removeEventListener('keydown', handleGlobalKeyPress);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [globalScanBuffer]);

  // Update cart prices when payment method changes
  useEffect(() => {
    if (cart.length > 0 && products.length > 0) {
      const updatedCart = cart.map(item => {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          const priceData = getProductPrice(product, paymentMethod);
          return {
            ...item,
            unit_price: priceData.price,
            currency: priceData.currency
          };
        }
        return item;
      });

      // Only update if prices actually changed
      const hasChanges = updatedCart.some((item, index) =>
        item.unit_price !== cart[index].unit_price ||
        item.currency !== cart[index].currency
      );

      if (hasChanges) {
        setCart(updatedCart);
      }
    }
  }, [paymentMethod, products]);

  const fetchProducts = async () => {
    try {
      const data = await productsService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      showNotification('Error al cargar productos', 'error');
    }
  };

  const fetchSims = async () => {
    try {
      setLoadingSims(true);
      const data = await simsService.getSims();
      setSims(data);
    } catch (error) {
      console.error('Error fetching SIMs:', error);
      showNotification('Error al cargar SIMs', 'error');
    } finally {
      setLoadingSims(false);
    }
  };


  const addItemsToCart = (items) => {
    if (!Array.isArray(items) || !items.length) return;

    console.log('addItemsToCart - Items a agregar:', items);
    console.log('addItemsToCart - Estado actual del carrito:', cart);

    setCart(prev => {
      console.log('addItemsToCart - Carrito anterior:', prev);
      const newCart = [...prev, ...items];
      console.log('addItemsToCart - Carrito nuevo:', newCart);
      return newCart;
    });

    showNotification(`${items.length} ítem(s) agregados al carrito`, 'success');
  };

  const addSimAndPlanToCart = () => {
    const sim = selectedSim;
    if (!sim) {
      showNotification('SIM no válida', 'error');
      return;
    }
    if (String(sim.estado).toLowerCase() === 'sold' || sim.vendida === true) {
      showNotification('Esta SIM ya está vendida', 'error');
      return;
    }

    // 1) Producto físico S01
    const simProd = findProductByCode('S01');
    if (!simProd) {
      showNotification('No encontré el producto S01 en la lista de productos', 'error');
      return;
    }

    // 2) Plan por código Siigo guardado en la SIM (ej. R7D)
    const planCode = (sim.plan_asignado || '').trim();
    if (!planCode) {
      showNotification('La SIM no tiene plan_asignado (código Siigo). Selecciónalo manualmente.', 'error');
      return;
    }
    const planProd = findProductByCode(planCode);
    if (!planProd) {
      showNotification(`No encontré el producto de plan con código ${planCode} en Siigo`, 'error');
      return;
    }

    // Obtener precios según método de pago
    const simPriceData = getProductPrice(simProd, paymentMethod);
    const planPriceData = getProductPrice(planProd, paymentMethod);

    // Construir ítems
    const items = [
      {
        product_id: simProd.id,
        product_name: simProd.name,
        product_code: simProd.code,
        quantity: 1,
        unit_price: simPriceData.price,
        currency: simPriceData.currency,
        taxes: simProd.taxes || [],
        tax_included: simProd.tax_included,
        sim_id: sim.id,
        sim_number: sim.numero_linea || sim.number,
        msisdn: sim.numero_linea || sim.number,
        iccid: sim.iccid,
      },
      {
        product_id: planProd.id,
        product_name: planProd.name,
        product_code: planProd.code,
        quantity: 1,
        unit_price: planPriceData.price,
        currency: planPriceData.currency,
        taxes: planProd.taxes || [],
        tax_included: planProd.tax_included,
        selected_plan: sim.plan_asignado,
      }
    ];
    addItemsToCart(items);
    setSelectedSim(null);
  };

  const addToCart = () => {
    if (!selectedProduct) return;

    const priceData = getProductPrice(selectedProduct, paymentMethod);

    const item = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product_code: selectedProduct.code,
      quantity: quantity,
      unit_price: priceData.price,
      currency: priceData.currency,
      taxes: selectedProduct.taxes || [],
      tax_included: selectedProduct.tax_included,
    };

    addItemsToCart([item]);
    setSelectedProduct(null);
    setQuantity(1);
  };

  const removeFromCart = (index) => {
    console.log('removeFromCart - Eliminando item en índice:', index);
    setCart(prev => {
      console.log('removeFromCart - Carrito antes:', prev);
      const newCart = prev.filter((_, i) => i !== index);
      console.log('removeFromCart - Carrito después:', newCart);
      return newCart;
    });
    showNotification('Ítem removido del carrito', 'info');
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    setCart(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: newQuantity } : item
    ));
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      showNotification('El carrito está vacío', 'error');
      return;
    }
    if (!turnoAbierto) {
      showNotification('Debes abrir un turno antes de registrar ventas', 'error');
      return;
    }

    // Check for multiple currencies
    if (totals.hasMultipleCurrencies) {
      showNotification('No puedes completar una venta con múltiples monedas. Por favor, usa un solo método de pago.', 'error');
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        items: cart.map(item => ({
          product_id: item.product_id,
          product_code: item.product_code,
          quantity: Number(item.quantity),
          unit_price: item.unit_price,
          description: item.product_name,
          sim_id: item.sim_id,
          selected_plan: item.selected_plan,
          taxes: item.taxes || []
        })),
        payment_method: paymentMethod,
        customer_id: "38165ed3-4562-45f6-8c59-78867af1989b",
        customer_identification: "222222222222"
      };

      const result = await salesService.createSale(saleData);

      // Calculate display total based on currency
      const displayTotal = totals.totalUSD > 0 ?
        formatPrice(totals.totalUSD, 'USD') :
        formatPrice(totals.totalCOP, 'COP');

      if (paymentMethod === "electronic") {
        showNotification(
          `Factura electrónica creada exitosamente. Total: ${displayTotal}`,
          'success'
        );
      } else if (paymentMethod === "dollars") {
        showNotification(
          `Venta en dólares registrada correctamente. Total: ${displayTotal}. ID: ${result?.venta_id || 'N/A'}`,
          'success'
        );
      } else {
        showNotification(
          `Venta en efectivo registrada correctamente. Total: ${displayTotal}. ID: ${result?.venta_id || 'N/A'}`,
          'success'
        );
      }

      // Clear cart and refresh data
      setCart([]);
      await Promise.all([fetchSims(), fetchProducts()]);

    } catch (error) {
      const msg = error?.response?.data?.detail ||
                  error?.response?.data?.message ||
                  error?.message ||
                  'Error desconocido en la venta';
      showNotification(`Error: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Precios en dólares para productos específicos
  const dollarPrices = {
    'S01': 3.00,    // Sim Card -Fisica
    'R7D': 8.99,    // RECARGA / 7 Dias / Claro
    'R15D': 13.99,  // RECARGA / 15 Dias / Claro
    'R5D': 4.99,    // RECARGA / 5 Dias / Claro
    'R30D': 18.99,  // RECARGA / 30 DIAS / Claro
    'ESIM': 4.00,   // ESIM
    'HT01': 30.00,  // MODEM HOTSPOT
    'MAPAV1': 2.99  // RECARGA MAPA V1
  };

  const formatPrice = (price, currency = 'COP') => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(price);
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(price);
  };

  const getProductPrice = (product, paymentMethod) => {
    if (paymentMethod === 'dollars' && dollarPrices[product.code]) {
      return { price: dollarPrices[product.code], currency: 'USD' };
    }
    return { price: product.unit_price, currency: 'COP' };
  };

  // Calculate cart totals with tax breakdown
  const totals = useMemo(() => {
    let subtotalCOP = 0;
    let subtotalUSD = 0;
    let taxesCOP = 0;
    let taxesUSD = 0;

    cart.forEach(item => {
      const itemSubtotal = item.quantity * item.unit_price;
      const currency = item.currency || 'COP';

      if (currency === 'USD') {
        subtotalUSD += itemSubtotal;
      } else {
        subtotalCOP += itemSubtotal;
      }

      // Calculate tax for this item
      if (item.taxes && item.taxes.length > 0) {
        const taxPercentage = item.taxes[0]?.percentage || 0;
        let itemTax = 0;

        if (!item.tax_included) {
          // Tax not included in price, add it
          itemTax = itemSubtotal * (taxPercentage / 100);
        } else {
          // Tax is included in price, extract it
          itemTax = itemSubtotal * (taxPercentage / (100 + taxPercentage));
          if (currency === 'USD') {
            subtotalUSD -= itemTax;
          } else {
            subtotalCOP -= itemTax;
          }
        }

        if (currency === 'USD') {
          taxesUSD += itemTax;
        } else {
          taxesCOP += itemTax;
        }
      }
    });

    return {
      subtotalCOP,
      subtotalUSD,
      taxesCOP,
      taxesUSD,
      totalCOP: subtotalCOP + taxesCOP,
      totalUSD: subtotalUSD + taxesUSD,
      hasMultipleCurrencies: subtotalCOP > 0 && subtotalUSD > 0
    };
  }, [cart]);

  const filteredProducts = (products || []).filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-blue-600" />
                <span>Buscar Productos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barcode Scanner */}
              <div className="flex space-x-2">
                <Input
                  ref={barcodeInputRef}
                  placeholder="Escanear código de barras o ICCID"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const code = barcodeInput.trim();
                      handleBarcodeOrIccid(code);
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    const code = barcodeInput.trim();
                    handleBarcodeOrIccid(code);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Scan className="w-4 h-4" />
                </Button>
              </div>

              {/* Global Scanner Indicator */}
              {globalScanBuffer.length > 0 && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <Scan className="w-4 h-4 text-green-600 animate-pulse" />
                    <span className="text-sm text-green-800">
                      Escaneando: <code className="bg-green-200 px-1 rounded">{globalScanBuffer}</code>
                    </span>
                  </div>
                </div>
              )}

              {/* Product Search */}
              <Input
                placeholder="Buscar por nombre o código"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Product Grid - 4 columnas en pantallas grandes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.slice(0, 12).map((product) => {
                  if (
                    !product ||
                    typeof product.unit_price !== 'number' ||
                    isNaN(product.unit_price)
                  ) {
                    console.warn('Producto inválido o sin precio:', product);
                    return null;
                  }

                  return (
                    <div
                      key={product.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedProduct?.id === product.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{product.name || 'Sin nombre'}</h3>
                          <p className="text-sm text-gray-600">Código: {product.code || 'Sin código'}</p>
                          <p className="text-lg font-bold text-blue-600">
                            {(() => {
                              const priceData = getProductPrice(product, paymentMethod);
                              return formatPrice(priceData.price, priceData.currency);
                            })()}
                          </p>
                          {paymentMethod === 'dollars' && dollarPrices[product.code] && (
                            <p className="text-sm text-gray-500">
                              Original: {formatPrice(product.unit_price, 'COP')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selector rápido de SIMs disponibles */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-blue-600">Seleccionar SIM disponible</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <Label>SIM disponible</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={selectedSim ? String(selectedSim.id) : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setSelectedSim(null);
                      return;
                    }
                    const sim = (sims || []).find(s => String(s.id) === String(val)) || null;
                    setSelectedSim(sim);
                    if (sim?.plan_asignado) setSelectedPlan(sim.plan_asignado);
                  }}
                >
                  <option value="">Elegir una SIM disponible</option>
                  {(sims || []).map((sim) => (
                    <option
                      key={String(sim.id)}
                      value={String(sim.id)}
                    >
                      {`${sim.numero_linea || sim.number || "—"} · ICCID: ${sim.iccid} · Plan: ${sim.plan_asignado || "—"}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  * El plan se toma del campo <b>plan_asignado</b> de la SIM (código Siigo, ej. R7D).
                </p>
              </div>

              <div className="md:col-span-1 flex justify-end">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!selectedSim}
                  onClick={() => selectedSim && addSimAndPlanToCart()}
                >
                  Agregar SIM + Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add to Cart */}
          {selectedProduct && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedProduct.name}</h3>
                    <p className="text-blue-600 font-bold">
                      {(() => {
                        const priceData = getProductPrice(selectedProduct, paymentMethod);
                        return formatPrice(priceData.price, priceData.currency);
                      })()}
                    </p>
                    {paymentMethod === 'dollars' && dollarPrices[selectedProduct.code] && (
                      <p className="text-sm text-gray-500">
                        Original: {formatPrice(selectedProduct.unit_price, 'COP')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-semibold w-8 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button onClick={addToCart} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Shopping Cart */}
        <div className="space-y-6">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                <span>Carrito de Compras</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Carrito vacío</p>
              ) : (
                <>
                  {cart.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product_name}</h4>
                          <p className="text-sm text-gray-600">Código: {item.product_code}</p>
                          {item.sim_number && (
                            <p className="text-sm text-blue-600">SIM: {item.sim_number}</p>
                          )}
                          {item.selected_plan && (
                            <p className="text-sm text-green-600">Plan: {item.selected_plan}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="font-semibold">
                          {formatPrice(item.unit_price * item.quantity, item.currency || 'COP')}
                        </p>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2">
                    {totals.totalCOP > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span>Subtotal COP:</span>
                          <span>{formatPrice(totals.subtotalCOP, 'COP')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IVA COP:</span>
                          <span>{formatPrice(totals.taxesCOP, 'COP')}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Total COP:</span>
                          <span className="text-green-600">{formatPrice(totals.totalCOP, 'COP')}</span>
                        </div>
                      </>
                    )}

                    {totals.totalUSD > 0 && (
                      <>
                        {totals.hasMultipleCurrencies && <hr className="my-1" />}
                        <div className="flex justify-between">
                          <span>Subtotal USD:</span>
                          <span>{formatPrice(totals.subtotalUSD, 'USD')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IVA USD:</span>
                          <span>{formatPrice(totals.taxesUSD, 'USD')}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Total USD:</span>
                          <span className="text-green-600">{formatPrice(totals.totalUSD, 'USD')}</span>
                        </div>
                      </>
                    )}

                    {totals.hasMultipleCurrencies && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                        <p className="text-xs text-yellow-800">
                          ⚠️ Carrito contiene múltiples monedas
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Payment Method */}
                  <div>
                    <Label>Método de Pago</Label>
                    <select
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="electronic">Datáfono</option>
                      <option value="cash">Efectivo</option>
                      <option value="dollars">Dólares</option>
                    </select>
                  </div>

                  <Button
                    onClick={completeSale}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3"
                  >
                    {loading ? 'Procesando...' : 'Completar Venta'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SalesPointOfSale;