import React, { useState, useEffect, useMemo  } from 'react';
import axios from 'axios';
import { ShoppingCart, Package, Upload, BarChart3, Search, Plus, Phone, User, Clock, Minus, X, Scan, FileText, DollarSign, Activity, AlertTriangle, Menu, ChevronLeft, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Alert, AlertDescription } from './components/ui/alert';
import { Separator } from './components/ui/separator';
import Login from "./Login";
import './App.css';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend,
  PieChart, Pie, Cell
} from 'recharts';



const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  // State Management
  const [products, setProducts] = useState([]);
  const [sims, setSims] = useState([]);
  const [cart, setCart] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
  sales: { revenue: 0, total: 0 },
  sims: { available: 0, sold: 0, total: 0 },
  alerts: { low_stock_operators: [] }
});
  const [dateFrom, setDateFrom] = useState(() => {
  const d = new Date(); d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0,10);
});
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0,10));
  const [onlyDiffs, setOnlyDiffs] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSim, setSelectedSim] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('electronic');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [user, setUser] = useState(null);
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = crear, objeto = editar
  const [roles, setRoles] = useState([]); // Lista de roles para el selector
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    email: "",
    role_id: ""
  });
  
  const [lotes, setLotes] = useState([]);
  const [selectedLote, setSelectedLote] = useState(null);
  const [loteParaRecargar, setLoteParaRecargar] = useState(null);
  const [planAsignar, setPlanAsignar] = useState('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [simsPorLote, setSimsPorLote] = useState({});
  const [lotesExpandido, setLotesExpandido] = useState({});
  const [changePwd, setChangePwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [turnoAbierto, setTurnoAbierto] = useState(null);
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [efectivoReportado, setEfectivoReportado] = useState('');
  const [ventasElectronicasInput, setVentasElectronicasInput] = useState('');
  const [ventasDatafonoInput, setVentasDatafonoInput] = useState('');
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [resumenCierre, setResumenCierre] = useState(null);
  const totalEsperado = useMemo(() => {
  const ve = Number(resumenCierre?.total_ventas_electronicas ?? 0);
  const vf = Number(resumenCierre?.total_ventas_efectivo ?? 0);
  const vd = Number(resumenCierre?.total_ventas_datafono ?? 0);
  return ve + vf + vd;
  }, [
    resumenCierre?.total_ventas_electronicas,
    resumenCierre?.total_ventas_efectivo,
    resumenCierre?.total_ventas_datafono
  ]);
  const [winredPackages, setWinredPackages] = useState([]);
  const [winredBalance, setWinredBalance] = useState({ balance: null, discount: null }); 
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const selectedPackage = winredPackages.find(
  p => String(p.product_id) === String(selectedPackageId)
) || null;
  const [misTurnos, setMisTurnos] = useState([]);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [movimientosTurno, setMovimientosTurno] = useState([]);
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const WINRED_ALLOWED_IDS = new Set(["1163", "1188", "1189", "1067"]);
  const [msisdnToTopup, setMsisdnToTopup] = useState("");
  const [selectedPackageBulkId, setSelectedPackageBulkId] = useState("");
  const [selectedPackageSingleId, setSelectedPackageSingleId] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Estado para la pestaña activa y el colapso de la barra lateral
  const [activeTab, setActiveTab] = useState('pos');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Definición de los elementos de navegación para el menú lateral
  const navItems = [
    { module: 'Dashboard', value: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { module: 'Punto de Venta', value: 'pos', name: 'Punto de Venta', icon: ShoppingCart },
    { module: 'SIMs', value: 'sims', name: 'SIMs', icon: Package },
    { module: 'Productos', value: 'products', name: 'Recargas', icon: Phone },
    { module: 'Usuarios', value: 'users', name: 'Usuarios', icon: User},
    { module: 'Punto de Venta', value: 'turnos', name: 'Turnos', icon: Clock },
  ];

  // Estados para modal y progreso de recarga
  const [showRecargaModal, setShowRecargaModal] = useState(false);
  const [recargaEnProgreso, setRecargaEnProgreso] = useState(false);
  const [recargaProgreso, setRecargaProgreso] = useState(0);
  const [tipoRecarga, setTipoRecarga] = useState(null); // 'lote' o 'individual'
  const [paramsRecarga, setParamsRecarga] = useState(null);


  // Available plans for SIMs
  const availablePlans = [
    '5GB x $15K',
    '10GB x $25K',
    '20GB x $40K',
    '50GB x $75K',
    'Unlimited x $100K'
  ];


  // === Helpers para POS (agregar SIM + plan) ===
  const findProductByCode = (code) =>
    (products || []).find(p => String(p.code).trim().toUpperCase() === String(code || "").trim().toUpperCase()) || null;

  const addItemsToCart = (items) => {
    if (!Array.isArray(items) || !items.length) return;
    setCart(prev => [...prev, ...items]);
    showNotification(`${items.length} ítem(s) agregados al carrito`, 'success');
  };

  const addSimAndPlanToCart = (sim) => {
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
    const planCode = (sim.plan_asignado || '').trim(); // <- aquí debe venir el código Siigo
    if (!planCode) {
      showNotification('La SIM no tiene plan_asignado (código Siigo). Selecciónalo manualmente.', 'error');
      setSelectedSim(sim);
      return;
    }
    const planProd = findProductByCode(planCode);
    if (!planProd) {
      showNotification(`No encontré el producto de plan con código ${planCode} en Siigo`, 'error');
      setSelectedSim(sim);
      return;
    }

    // Construir ítems (enviamos msisdn/iccid para que el backend pueda marcar vendida)
    const items = [
      {
        product_id: simProd.id,
        product_name: simProd.name,
        product_code: simProd.code,
        quantity: 1,
        unit_price: Number(simProd.unit_price) || 0,
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
        unit_price: Number(planProd.unit_price) || 0,
        taxes: planProd.taxes || [],
        tax_included: planProd.tax_included,
        sim_id: sim.id,
        sim_number: sim.numero_linea || sim.number,
        msisdn: sim.numero_linea || sim.number,
        iccid: sim.iccid,
        selected_plan: planCode,
      }
    ];

    addItemsToCart(items);
    // opcional: limpiar selección puntual
    setSelectedProduct(null);
    setSelectedPlan('');
    setSelectedSim(null);
    setBarcodeInput('');
  };


    // Función para formatear precios (AGREGA ESTO JUSTO AQUÍ)
    const formatPrice = (price) => {
      const value = Number(price) || 0;
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP'
      }).format(value);
    };

    // Fetch data on component mount
    useEffect(() => {
      if (user) {
        fetchProducts();
        fetchSims();
        fetchLotes();
        fetchDashboardStats();
        verificarTurno();
        fetchWinredBalance();
        fetchWinredPackages(1);  
        fetchMisTurnos();   
        setSelectedPackageBulkId("");
        setSelectedPackageSingleId(""); 

      }
    }, [user]);


// === Escaneo global y búsqueda de SIM/Producto (UN SOLO BLOQUE) ===
const [simOpen, setSimOpen] = useState(false);

// Detectores simples (defínelos una vez)
const isAllDigits = (s) => /^\d+$/.test(String(s || '').trim());
const isICCID   = (s) => isAllDigits(s) && String(s).length >= 19 && String(s).length <= 22; // 19–22
const isMSISDN  = (s) => isAllDigits(s) && String(s).length >= 7  && String(s).length <= 15; // 7–15

// Refs vacías: NO pases funciones aquí para evitar el "before initialization"
const simSearchRef  = React.useRef(null);
const prodSearchRef = React.useRef(null);

/** Busca producto por código y (opcionalmente) lo selecciona */
const searchProductByCode = async (code) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/products?search=${code}`);
    if (response.data.products.length > 0) {
      setSelectedProduct(response.data.products[0]);
      setBarcodeInput('');
      return response.data.products[0];
    } else {
      showNotification('Product not found', 'error');
      return null;
    }
  } catch (error) {
    console.error('Error searching product:', error);
    showNotification('Error searching product', 'error');
    return null;
  }
};

/** Busca SIM por ICCID/MSISDN y agrega S01 + plan asignado al carrito */
const searchSimByCode = async (codeRaw) => {
  const code = String(codeRaw || '').trim();
  if (!code) return null;

  // Decide si mandar iccid o msisdn según el patrón
  const params = isICCID(code)
    ? { iccid: code }
    : isMSISDN(code)
    ? { msisdn: code }
    : null;

  if (!params) {
    showNotification("Formato no reconocido como ICCID/MSISDN", "error");
    return null;
  }

  try {
    const { data } = await axios.get(`${API_BASE_URL}/api/sims/search`, { params });
    const sim = data?.sim || null;

    if (!sim) {
      showNotification("SIM no encontrada", "error");
      return null;
    }

    setSelectedSim(sim);
    // Auto‑agrega S01 + plan asignado (si lo tiene)
    addSimAndPlanToCart(sim);
    setBarcodeInput('');
    return sim;
  } catch (error) {
    console.error("Error buscando SIM:", error);
    showNotification(error.response?.data?.detail || "Error buscando SIM", "error");
    return null;
  }
};

// Mantén los refs sincronizados con las funciones DEFINIDAS ARRIBA
useEffect(() => {
  simSearchRef.current  = searchSimByCode;
  prodSearchRef.current = searchProductByCode;
}, [searchSimByCode, searchProductByCode]);

// Escáner global de teclado (para lector de código de barras)
useEffect(() => {
  if (!user) return;

  let buffer = "";
  let lastTs = 0;

  const isTypingInField = (el) => {
    if (!el) return false;
    const tag = el.tagName?.toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
  };

  const onKeyDown = (e) => {
    // No interferir si el foco está en un campo editable
    if (isTypingInField(document.activeElement)) return;

    const now = Date.now();
    // Reinicia buffer si pasó "mucho" tiempo entre teclas (ajusta si tu escáner es más lento)
    if (now - lastTs > 120) buffer = "";
    lastTs = now;

    if (e.key && e.key.length === 1) {
      buffer += e.key;
      return;
    }

    if (e.key === "Enter") {
      const code = buffer.trim();
      buffer = "";
      if (!code) return;

      if (isICCID(code) || isMSISDN(code)) {
        e.preventDefault();
        simSearchRef.current?.(code);     // agrega SIM + plan al carrito
      } else {
        prodSearchRef.current?.(code);    // intenta como producto
      }
    }
  };

  document.addEventListener("keydown", onKeyDown, true);
  return () => document.removeEventListener("keydown", onKeyDown, true);
}, [user]);


  // API Functions
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/siigo`);
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP error! status: ${res.status} - ${errText}`);
      }
      
      const data = await res.json();
      console.log('Respuesta bruta de productos:', data);

      // Accedemos directamente a data.products (ya filtrado en el backend)
      const productosFormateados = (data.products || []).map(p => {
        // Extracción del precio
        const defaultPrice = 0;
        const priceObject = p?.prices?.[0]?.price_list?.[0];
        const unitPrice = priceObject?.value ?? defaultPrice;
        
        // Validación adicional para asegurar que sea número
        const finalPrice = typeof unitPrice === 'number' ? unitPrice : defaultPrice;
        
        // Taxes de los productos
        const iva = p?.taxes?.[0]?.percentage ?? 0;

        return {
          id: p.id,
          name: p.name || 'Producto sin nombre',
          code: p.code || 'Sin código',
          type: p.type,
          unit_price: finalPrice > 0 ? finalPrice : defaultPrice,
          iva: iva,
          taxes: p.taxes || [],
          tax_included: p.tax_included ?? true  // Usamos ?? para manejar undefined
        };
      });

      console.log('Productos procesados:', productosFormateados);
      setProducts(productosFormateados);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      showNotification('Error fetching products', 'error');
    }
  };

  // Login

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Configuración global para que Axios envíe siempre el token
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      axios.get(`${API_BASE_URL}/api/auth/me`)
        .then(res => {
          setUser(res.data);
          setModules(res.data.modules);
        })
        .catch(() => {
          localStorage.removeItem("token");
        });
    }
  }, []);



  // Función para obtener usuarios
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Función para eliminar usuario
  const deleteUser = async (id) => {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/users/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      fetchUsers();
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      alert(error.response?.data?.detail || "Error al eliminar usuario");
    }
  };


  // Función para abrir modal

  const openUserForm = async (user = null) => {
    // Asegura que haya roles disponibles antes de abrir el modal
    if (!roles.length) {
      try { await fetchRoles(); } catch (e) { console.error(e); }
    }

    setEditingUser(user);

    if (user) {
      // Encontrar el id del rol: por nombre (venía en u.role) o por role_id directo
      const resolvedRoleId =
        roles.find(r => r.name === user.role)?.id ??
        (user.role_id ?? "");

      setFormData({
        username: user.username ?? "",
        password: "",                 // nunca prellenar en edición
        full_name: user.full_name ?? "",
        email: user.email ?? "",
        role_id: resolvedRoleId ? String(resolvedRoleId) : ""
      });
    } else {
      // Crear
      const defaultRoleId = roles[0]?.id ? String(roles[0].id) : "";
      setFormData({
        username: "",
        password: "",
        full_name: "",
        email: "",
        role_id: defaultRoleId
      });
    }

    setShowUserForm(true);
  };

  // Función guardar usuario
  const saveUser = async () => {
    try {
      if (editingUser) {
        // 1) Actualiza datos básicos
        await axios.put(`${API_BASE_URL}/api/users/${editingUser.id}`, {
          full_name: formData.full_name,
          email: formData.email,
          role_id: formData.role_id
        });

        // 2) Si se pidió cambio de contraseña
        if (changePwd) {
          if (!newPwd || newPwd.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres");
            return;
          }
          if (newPwd !== confirmPwd) {
            alert("Las contraseñas no coinciden");
            return;
          }
          await axios.post(`${API_BASE_URL}/api/users/${editingUser.id}/reset_password`, {
            new_password: newPwd
          });
        }
      } else {
        // Crear
        await axios.post(`${API_BASE_URL}/api/users`, {
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          email: formData.email,
          role_id: formData.role_id
        });
      }

      setShowUserForm(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error al guardar usuario");
    }
  };

  // Cargar Roles

  useEffect(() => {
    if (modules.includes("Usuarios")) {
      fetchUsers();
      fetchRoles();
    }
  }, [modules]);

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/roles/`);
      setRoles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const syncProducts = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/products/sync`);
      showNotification('Product sync initiated. Please wait a moment and refresh.', 'success');
      setTimeout(fetchProducts, 3000); // Reutiliza fetchProducts para recargar
    } catch (error) {
      console.error('Error syncing products:', error);
      showNotification('Error syncing products from Siigo', 'error');
    } finally {
      setLoading(false);
    }
  };

      if (!user) {
    return <Login onLogin={() => window.location.reload()} />;
  }




  const fetchSims = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sims?status=available`);
      setSims(response.data.sims);
    } catch (error) {
      console.error('Error fetching SIMs:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sims/dashboard/stats`);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      showNotification('Error al cargar estadísticas del dashboard', 'error');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        start: dateFrom,
        end: dateTo,
        only_diffs: String(onlyDiffs)
      }).toString();

      const { data } = await axios.get(`${API_BASE_URL}/api/sims/dashboard/analytics?${params}`);
      setAnalytics(data);
    } catch (e) {
      console.error(e);
      showNotification(e?.response?.data?.detail || "Error cargando analytics", "error");
    }
  };

  // Cart Functions
  const addToCart = () => {
    if (!selectedProduct) {
      showNotification('Please select a product', 'error');
      return;
    }

    // Si el producto es la SIM física y la SIM tiene plan asignado, añade ambos
    const isSimFisica = selectedProduct.code === 'S01';
    const simPlan = selectedSim?.plan_asignado || '';

    if (isSimFisica && !selectedSim) {
      showNotification('Selecciona una SIM', 'error');
      return;
    }

    if (isSimFisica && !simPlan) {
      showNotification('La SIM no tiene plan_asignado (código Siigo). Selecciónalo manualmente', 'error');
      return;
    }

    const unitPrice = Number(selectedProduct.unit_price) || 0;

    const cartItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product_code: selectedProduct.code,
      quantity: quantity,
      unit_price: unitPrice,
      sim_id: selectedSim?.id,
      sim_number: selectedSim?.number,
      selected_plan: selectedPlan,
      taxes: selectedProduct.taxes,
      tax_included: selectedProduct.tax_included
    };

    setCart([...cart, cartItem]);
    showNotification(`${selectedProduct.name} added to cart`, 'success');
    
    // Reset selections
    setSelectedProduct(null);
    setSelectedSim(null);
    setSelectedPlan('');
    setQuantity(1);
  };

  const removeFromCart = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    showNotification('Item removed from cart', 'success');
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) return;
    const newCart = [...cart];
    newCart[index].quantity = newQuantity;
    setCart(newCart);
  };

  const calculateTotals = () => {
    return cart.reduce(
      (acc, item) => {
        const price = Number(item.unit_price) || 0;
        const quantity = Number(item.quantity) || 1;
        const ivaPercentage = item.taxes?.[0]?.percentage || 0;
        
        // Determinar si el precio ya incluye IVA
        const priceIncludesTax = item.tax_included;
        
        let itemSubtotal, itemTax;
        
        if (priceIncludesTax) {
          // Si el precio ya incluye IVA, lo extraemos
          itemSubtotal = price * quantity / (1 + (ivaPercentage / 100));
          itemTax = (price * quantity) - itemSubtotal;
        } else {
          // Si el precio no incluye IVA, lo calculamos
          itemSubtotal = price * quantity;
          itemTax = itemSubtotal * (ivaPercentage / 100);
        }
        
        const itemTotal = itemSubtotal + itemTax;

        acc.subtotal += itemSubtotal;
        acc.taxes += itemTax;
        acc.total += itemTotal;

        return acc;
      },
      { subtotal: 0, taxes: 0, total: 0 }
    );
  };

  const completeSale = async () => {
  if (cart.length === 0) {
    showNotification('Cart is empty', 'error');
    return;
  }
  if (!turnoAbierto) {
    showNotification('Debes abrir un turno antes de registrar ventas', 'error');
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
      payment_method: paymentMethod,          // "cash" o "electronic"
      customer_id: "38165ed3-4562-45f6-8c59-78867af1989b",
      customer_identification: "222222222222"
    };

    if (paymentMethod === "electronic") {
      const { data } = await axios.post(`${API_BASE_URL}/api/sales/create_invoice`, saleData);
      showNotification(
        `Factura electrónica creada exitosamente. Total: ${formatPrice(data?.total || 0)}`,
        'success'
      );
    } else {
      const { data } = await axios.post(`${API_BASE_URL}/api/sales/ventas`, saleData);
      showNotification(
        `Venta en efectivo registrada correctamente. ID: ${data?.venta_id || 'N/A'}`,
        'success'
      );
    }

    // Limpieza + refrescos (en orden)
    setCart([]);
    if (typeof fetchLotes === "function") await fetchLotes();          // <-- para Disponibles/Vendidas
    if (typeof fetchSims === "function") await fetchSims();            // <-- lista de SIMs
    if (typeof fetchDashboardStats === "function") await fetchDashboardStats();

  } catch (error) {
    const msg = error?.response?.data?.detail
             || error?.response?.data?.message
             || error?.message
             || "Error desconocido";
    console.error('Error completing sale:', error);
    showNotification(`Error al completar la venta: ${msg}`, 'error');
  } finally {
    setLoading(false);
  }
};



  // Utility Functions
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(''), 4000);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = calculateTotals();

  const uploadSims = async () => {
    if (!uploadFile) {
      showNotification('Por favor selecciona un archivo', 'error');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/sims/upload_lotes`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showNotification(response.data.message, 'success');
      
      // Refrescar tabla de lotes después de subir
      fetchLotes();  
      setUploadFile(null);
    } catch (error) {
      console.error('Error al subir SIMs:', error);
      const errorMsg = error.response?.data?.detail || 'Error al subir el archivo de SIMs';
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLotes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sims/lotes`);
      setLotes(response.data.lotes);
    } catch (error) {
      console.error("Error fetching lotes:", error);
      showNotification("Error al cargar lotes", "error");
    }
  };

  

  // Nueva función: asignar plan a un lote
  const asignarPlan = async () => {
    if (!selectedLote || !planAsignar) {
      showNotification("Selecciona un plan", "error");
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/sims/asignar_plan/${selectedLote}`, null, {
        params: { plan: planAsignar }
      });
      showNotification(`Plan asignado correctamente al lote ${selectedLote}`, "success");
      setShowPlanModal(false);
      setPlanAsignar('');
      setSelectedLote(null);
      fetchLotes();
    } catch (error) {
      console.error("Error asignando plan:", error);
      showNotification("Error al asignar plan", "error");
    }
  };

  const fetchSimsDeLote = async (loteId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sims/por_lote?lote_id=${loteId}`);
      setSimsPorLote(prev => ({ ...prev, [loteId]: response.data.sims }));
    } catch (error) {
      console.error("Error al obtener SIMs del lote:", error);
    }
  };


  const toggleLoteExpandido = async (loteId) => {
    const isExpanded = lotesExpandido[loteId];
    setLotesExpandido(prev => ({ ...prev, [loteId]: !isExpanded }));

    if (!isExpanded && !simsPorLote[loteId]) {
      await fetchSimsDeLote(loteId);
    }
  };


// ==================== TURNOS ====================

// Verificar estado de turno (robusta)
const verificarTurno = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No hay token disponible');
      return;
    }

    const response = await axios.get(`${API_BASE_URL}/api/turnos/estado`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    if (response.data && typeof response.data === 'object') {
      setTurnoAbierto(response.data);
    } else {
      setTurnoAbierto(null);
    }
  } catch (error) {
    console.error("Error completo:", error);
    if (error.code === 'ECONNABORTED') {
      showNotification('El servidor no respondió a tiempo', 'error');
    } else if (error.response) {
      if (error.response.status === 401) {
        showNotification('Sesión expirada. Por favor inicie sesión nuevamente', 'error');
        localStorage.removeItem('token');
        window.location.reload();
      } else {
        showNotification(error.response?.data?.detail || 'Error al verificar el turno', 'error');
      }
    } else if (error.request) {
      showNotification('Error de conexión con el servidor', 'error');
    } else {
      showNotification('Error al verificar el turno', 'error');
    }
    setTurnoAbierto(null);
  }
};

// Abrir turno (con headers y timeout)
const abrirTurno = async () => {
  try {
    console.log('Abriendo nuevo turno...');
    const response = await axios.post(
      `${API_BASE_URL}/api/turnos/abrir`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    if (response.data && response.data.id) {
      setTurnoAbierto(response.data);
      showNotification('Turno abierto correctamente', 'success');
      console.log('Turno abierto con éxito:', response.data);
      fetchDashboardStats();
      fetchMisTurnos();
    } else {
      throw new Error('Respuesta inválida al abrir turno');
    }
  } catch (error) {
    console.error("Error abriendo turno:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    const errorMessage = error.response?.data?.detail || 
                        error.message || 
                        'Error al abrir turno';
    showNotification(errorMessage, 'error');
    verificarTurno();
  }
};

// Preparar cierre (mantiene resumen visual con /sales/por-turno)
const prepararCierre = async () => {
  try {
    if (!turnoAbierto) {
      showNotification('No hay un turno abierto para cerrar', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    const { data } = await axios.get(`${API_BASE_URL}/api/turnos/por-turno`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // data = { turno_id, fecha_apertura, cantidad_ventas, total_ventas_electronicas, total_ventas_efectivo, total_ventas_datafono }
    setResumenCierre({
      turno_id: data.turno_id,
      fecha_apertura: data.fecha_apertura,
      cantidad_ventas: data.cantidad_ventas || 0,
      total_ventas_electronicas: data.total_ventas_electronicas || 0,
      total_ventas_efectivo: data.total_ventas_efectivo || 0,
      total_ventas_datafono: data.total_ventas_datafono || 0,
      efectivo_reportado: data.total_ventas_efectivo || 0, // por defecto
      observaciones: '',
    });

    // si usas estados separados:
    setEfectivoReportado(String(data.total_ventas_efectivo || 0));
    setVentasElectronicasInput(String(data.total_ventas_electronicas || 0));
    setVentasDatafonoInput(String(data.total_ventas_datafono || 0));
    setObservacionesCierre('');

    setShowCierreModal(true);
  } catch (err) {
    console.error('Error preparando cierre:', err);
    const msg = err.response?.data?.detail || 'Error al preparar cierre de caja';
    showNotification(msg, 'error');
  }
};

// Cerrar turno (envía solo efectivo_reportado y observaciones)
const cerrarTurno = async () => {
  try {
    // 0) Token
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification('Sesión expirada. Inicia sesión nuevamente.', 'error');
      return;
    }

    // 1) Validaciones del efectivo reportado
    if (efectivoReportado === '' || efectivoReportado === null || efectivoReportado === undefined) {
      showNotification('Debe ingresar el monto de efectivo reportado', 'error');
      return;
    }

    // Función para normalizar números ingresados
    const normalizaNumero = (v) =>
      String(v).replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.');

    // Normalizar y convertir efectivo reportado
    const efectivoValue = parseFloat(normalizaNumero(efectivoReportado));
    if (Number.isNaN(efectivoValue)) {
      showNotification('El monto de efectivo debe ser un número válido', 'error');
      return;
    }
    if (efectivoValue < 0) {
      showNotification('El monto de efectivo no puede ser negativo', 'error');
      return;
    }

    // Normalizar ventas electrónicas y datafono
    const ventasElecRep = parseFloat(normalizaNumero(ventasElectronicasInput)) || 0;
    const ventasDatRep = parseFloat(normalizaNumero(ventasDatafonoInput)) || 0;

    // Unir observaciones con los nuevos campos
    const obsConCampos = [
      (observacionesCierre || '').trim(),
      `Ventas Electrónicas (reportadas): ${ventasElecRep}`,
      `Ventas Datafono (reportadas): ${ventasDatRep}`,
    ]
      .filter(Boolean)
      .join(' | ');

    // 2) Payload simplificado; el backend calcula totales
    const payload = {
      efectivo_reportado: efectivoValue,
      observaciones: obsConCampos,
    };

    console.log('Enviando datos de cierre:', payload);

    const response = await axios.post(
      `${API_BASE_URL}/api/turnos/cerrar`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    if (!response?.data || typeof response.data !== 'object') {
      throw new Error('Respuesta del servidor inválida');
    }

    // 3) Éxito
    showNotification('Turno cerrado correctamente', 'success');
    setShowCierreModal(false);
    setTurnoAbierto(null);
    setEfectivoReportado('');
    setObservacionesCierre('');
    setVentasElectronicasInput('');
    setVentasDatafonoInput('');
    fetchMisTurnos();

    // Refrescar datos
    fetchDashboardStats?.();
    verificarTurno?.();

  } catch (error) {
    console.error('Error en cerrarTurno:', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    let msg = 'Error al cerrar el turno';

    if (error?.code === 'ECONNABORTED') {
      msg = 'La solicitud tardó demasiado. Intente nuevamente.';
    } else if (error?.response) {
      const { status, data } = error.response;

      if (status === 401) {
        msg = 'Sesión expirada. Inicia sesión nuevamente.';
        localStorage.removeItem('token');
      } else if (status === 422) {
        const detail = data?.detail;
        if (Array.isArray(detail)) {
          msg =
            'Errores de validación:\n' +
            detail
              .map((e) => `- ${e.loc ? e.loc.join('.') + ' ' : ''}${e.msg}`)
              .join('\n');
        } else {
          msg = detail || 'Error de validación';
        }
      } else {
        msg = data?.detail || data?.message || msg;
      }
    } else if (error?.request) {
      msg = 'No se recibió respuesta del servidor. Verifique su conexión.';
    }

    showNotification(msg, 'error');
    verificarTurno?.();
  }
};

// ==== Detalle Turnos ====

const fetchMisTurnos = async () => {
  try {
    setLoadingTurnos(true);
    const { data } = await axios.get(`${API_BASE_URL}/api/turnos/mis`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    setMisTurnos(data.turnos || []);
  } catch (e) {
    showNotification(e.response?.data?.detail || "Error cargando turnos", "error");
  } finally {
    setLoadingTurnos(false);
  }
};

const fetchMovimientosDeTurno = async (turno_id) => {
  try {
    setLoadingTurnos(true);
    const { data } = await axios.get(`${API_BASE_URL}/api/turnos/${turno_id}/movimientos`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    setMovimientosTurno(data.movimientos || []);
  } catch (e) {
    showNotification(e.response?.data?.detail || "Error cargando movimientos", "error");
  } finally {
    setLoadingTurnos(false);
  }
};




// ==== WINRED API ====

const fetchWinredPackages = async (productParentId = 1) => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/api/winred/packages`, {
      params: { product_parent_id: productParentId, _: Date.now() },
    });

    const pkgs = data?.data?.packages || data?.packages || [];
    setWinredPackages(pkgs);

    // si el paquete elegido ya no está, limpia solo ese select
    if (!pkgs.find(p => String(p.product_id) === String(selectedPackageBulkId))) {
      setSelectedPackageBulkId("");
    }
    if (!pkgs.find(p => String(p.product_id) === String(selectedPackageSingleId))) {
      setSelectedPackageSingleId("");
    }
  } catch (e) {
    console.warn("Winred packages error:", e?.response?.data || e.message);
    setWinredPackages([]);
    setSelectedPackageBulkId("");
    setSelectedPackageSingleId("");
    showNotification("Error cargando paquetes Winred", "error");
  }
};


const fetchWinredBalance = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/api/winred/balance`);
    const d = data?.data || {};
    setWinredBalance({ balance: d.balance ?? null, discount: d.discount ?? null });
  } catch (e) {
    console.error(e);
  }
};

const recargaIndividual = async ({ product_id, amount = 0, subscriber, sell_from = "S" }) => {
  try {
    setLoading(true);
    const { data } = await axios.post(`${API_BASE_URL}/api/winred/topup`, {
      product_id,
      amount,
      subscriber,   // <-- clave correcta para Pydantic TopupRequest
      sell_from
    });
    showNotification("Recarga enviada", "success");
    fetchWinredBalance();
    // Refrescar inventario para ver plan asignado en SIM/lote
    fetchLotes();
    fetchSims();
    return data;
  } catch (e) {
    showNotification(e.response?.data?.detail || "Error en recarga", "error");
  } finally {
    setLoading(false);
  }
};

const recargaMasivaPorLote = async ({ lote_id, product_id, amount=0, sell_from="S", setRecargaProgreso }) => {
  try {
    setLoading(true);
    if (setRecargaProgreso) setRecargaProgreso(20);
    const { data } = await axios.post(`${API_BASE_URL}/api/winred/topup_lote`, { lote_id, product_id, amount, sell_from });
    // Si el backend retorna la cantidad de procesados, puedes calcular el % aquí
    if (setRecargaProgreso) setRecargaProgreso(80);
    fetchWinredBalance();
    if (typeof fetchLotes === "function") fetchLotes();
    if (typeof fetchSims === "function") fetchSims();
    if (setRecargaProgreso) setRecargaProgreso(100);
    return data;
  } catch (e) {
    if (setRecargaProgreso) setRecargaProgreso(0);
    showNotification(e.response?.data?.detail || "Error en recarga masiva", "error");
  } finally { setLoading(false); }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      {/* Barra lateral colapsable */}
      <aside
        className={`bg-white shadow-md border-r transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
        style={{ marginRight: '0px' }}
      >
        {/* Encabezado de la barra lateral: logo y botón de colapso */}
        <div className="h-16 flex items-center justify-between px-2" style={{ padding: '0 0.5rem' }}>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">Local Sim</h1>
                <p className="text-xs text-gray-500">Sistema de Ventas y Gestión</p>
              </div>
            )}
          </div>
          {/* Eliminamos el botón de colapso de la barra lateral */}
        </div>
        {/* Navegación lateral */}
        <nav className="mt-4">
          {navItems
            .filter((item) => modules.includes(item.module))
            .map(({ value, name, icon: IconComponent }) => {
              const isActive = activeTab === value;
              return (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className={`w-full flex items-center px-4 py-3 space-x-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  {!isSidebarCollapsed && <span>{name}</span>}
                </button>
              );
            })}
        </nav>
      </aside>

      {/* Contenedor principal: se desplaza según el tamaño de la barra lateral */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
        style={{ marginLeft: '0' }}
      >
        {/* Header */}
        <header className="bg-white shadow-lg border-b-4 border-blue-500">
          <div className="flex justify-between items-center py-2 px-2 sm:px-4 lg:px-6" style={{ padding: '0.5rem' }}>
            {/* Icono para abrir/cerrar el menú lateral - Este es el único botón que queda */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-200"
              style={{ marginLeft: 0 }}  
            >
              {isSidebarCollapsed ? (
                <Menu className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>

          {/* Área superior derecha con badges y menú de usuario */}
          <div className="flex items-center space-x-3 relative">
            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
              Cart: {cart.length} items
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
              Total: {formatPrice(totals?.total)}
            </Badge>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-1 px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <span>{user?.full_name || user?.username || 'Usuario'}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-20">
                  {turnoAbierto ? (
                    <button
                      onClick={prepararCierre}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      Cerrar turno
                    </button>
                  ) : (
                    <button
                      onClick={abrirTurno}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      Abrir turno
                    </button>
                  )}
                  <hr className="border-gray-200" />
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      window.location.reload();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

    {turnoAbierto && (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center space-x-4">
          <span>
            Turno abierto desde:&nbsp;
            {new Date(turnoAbierto.fecha_apertura).toLocaleTimeString()}
          </span>
        </div>
      </div>
    )}



      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50">
          <Alert className={`${notification.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <AlertDescription className={notification.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {notification.message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          {/* Point of Sale Tab */}
          <TabsContent value="pos" className="space-y-6">
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
                        placeholder="Escanear código de barras o ICCID"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const code = barcodeInput.trim();
                            if (!code) return;

                            if (isICCID(code) || isMSISDN(code)) {
                              // ICCID/MSISDN → agrega SIM + plan automáticamente
                              searchSimByCode(code);
                            } else {
                              // No parece SIM → intenta como producto
                              searchProductByCode(code);
                            }
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => {
                          const code = barcodeInput.trim();
                          if (!code) return;

                          if (isICCID(code) || isMSISDN(code)) {
                            searchSimByCode(code);
                          } else {
                            searchProductByCode(code);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Scan className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Product Search */}
                    <Input
                      placeholder="Buscar por nombre o código"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {/* Product Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredProducts.slice(0, 7).map((product) => {
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
                                  {formatPrice(product.unit_price)}
                                </p>
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
                    <div className="md:col-span-2" style={{ contain: 'layout' }}>
                      <Label>SIM disponible</Label>

                      {/*
                        👉 Controlamos el Select por "valor".
                        selectedSimId es un string con el id; si no lo tienes,
                        crea el estado arriba: const [selectedSimId, setSelectedSimId] = useState("");
                      */}
                      <Select
                        value={selectedSim ? String(selectedSim.id) : ""}
                        onValueChange={(val) => {
                          const sim = (sims || []).find(s => String(s.id) === String(val)) || null;
                          setSelectedSim(sim);
                          if (sim?.plan_asignado) setSelectedPlan(sim.plan_asignado);
                        }}
                        open={simOpen}
                        onOpenChange={setSimOpen}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Elegir una SIM disponible" />
                        </SelectTrigger>

                        <SelectContent
                          position="popper"
                          sideOffset={8}
                          // ✅ deja que Radix resuelva colisiones/flip
                          // (si te vuelve el warning del ResizeObserver, puedes volver a poner contain:layout)
                          avoidCollisions
                          // ✅ que se vea arriba de todo
                          className="z-[999] max-h-64 overflow-auto will-change-[transform,opacity]"
                          align="start"
                        >
                          {(sims || []).map((sim) => (
                            <SelectItem
                              key={String(sim.id)}
                              value={String(sim.id)}   // 👈 ahora el onValueChange nos da "val"
                            >
                              {`${sim.numero_linea || sim.number || "—"} · ICCID: ${sim.iccid} · Plan: ${sim.plan_asignado || "—"}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <p className="text-xs text-gray-500 mt-1">
                        * El plan se toma del campo <b>plan_asignado</b> de la SIM (código Siigo, ej. R7D).
                      </p>
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        disabled={!selectedSim}
                        onClick={() => selectedSim && addSimAndPlanToCart(selectedSim)}
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
                          <p className="text-blue-600 font-bold">{formatPrice(selectedProduct.unit_price)}</p>
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
                                {formatPrice(item.unit_price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        ))}

                        <Separator />

                        {/* Totals */}
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>{formatPrice(totals.subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>IVA ({cart.some(item => item.taxes?.[0]?.percentage) ? 'según producto' : '0%'}):</span>
                            <span>{formatPrice(totals.taxes)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total:</span>
                            <span className="text-green-600">{formatPrice(totals.total)}</span>
                          </div>
                        </div>

                        <Separator />

                        {/* Payment Method */}
                        <div>
                          <Label>Método de Pago</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="electronic">Electrónico (Siigo)</SelectItem>
                              <SelectItem value="cash">Efectivo</SelectItem>
                            </SelectContent>
                          </Select>
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
          </TabsContent>

          {/* SIM Management Tab */}
          <TabsContent value="sims" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cargar SIMs */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <span>Cargar Lotes de SIMs</span>
                  </CardTitle>
                  <CardDescription>
                    Suba un archivo Excel con columnas: lote_id, numero_linea, iccid, operador
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                  />
                  <Button onClick={uploadSims} disabled={loading || !uploadFile}>
                    {loading ? 'Subiendo...' : 'Subir SIMs'}
                  </Button>
                </CardContent>
              </Card>

              {/* Estadísticas de SIMs */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Estadísticas de SIMs</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardStats?.sims ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-semibold">{dashboardStats.sims.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Disponibles:</span>
                        <span className="font-semibold text-green-600">{dashboardStats.sims.available}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vendidas:</span>
                        <span className="font-semibold text-blue-600">{dashboardStats.sims.sold}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Cargando estadísticas...</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Listado de Lotes */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mt-6">
              <CardHeader>
                <CardTitle>Listado de Lotes</CardTitle>
              </CardHeader>
              <CardContent>
                {lotes.length === 0 ? (
                  <p className="text-gray-500">No hay lotes registrados</p>
                ) : (
                  <table className="min-w-full border border-gray-200 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-2 py-1">Lote ID</th>
                        <th className="border px-2 py-1">Operador</th>
                        <th className="border px-2 py-1">Plan Asignado</th>
                        <th className="border px-2 py-1">Estado</th>
                        <th className="border px-2 py-1">Total SIMs</th>
                        <th className="border px-2 py-1">Disponibles</th>
                        <th className="border px-2 py-1">Recargadas</th>
                        <th className="border px-2 py-1">Vendidas</th>
                        
                      </tr>
                    </thead>
                    <tbody>
                      {lotes.map((lote) => (
                        <>
                          <tr key={lote.lote_id}>
                            <td className="border px-2 py-1">
                              <button onClick={() => toggleLoteExpandido(lote.lote_id)}>
                                {lotesExpandido[lote.lote_id] ? "−" : "➕"}
                              </button>{" "}
                              {lote.lote_id}
                            </td>
                            <td className="border px-2 py-1">{lote.operador}</td>
                            <td className="border px-2 py-1">{lote.plan_asignado || "Pendiente"}</td>
                            <td className="border px-2 py-1">{lote.estado}</td>
                            <td className="border px-2 py-1">{lote.total_sims}</td>
                            <td className="border px-2 py-1 text-green-600">{lote.sims_disponibles}</td>
                            <td className="border px-2 py-1 text-blue-600">{lote.sims_recargadas}</td>
                            <td className="border px-2 py-1 text-red-600">{lote.sims_vendidas}</td>
                            <td className="border px-2 py-1">
                            </td>
                          </tr>
                          {lotesExpandido[lote.lote_id] && simsPorLote[lote.lote_id] && (
                            <tr>
                              <td colSpan="9" className="border px-2 py-1 bg-gray-50">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left bg-gray-200">                                     
                                      <th className="px-2 py-1">Número</th>
                                      <th className="px-2 py-1">ICCID</th>
                                      <th className="px-2 py-1">Estado</th>
                                      <th className="px-2 py-1">Fecha Registro</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {simsPorLote[lote.lote_id].map((sim) => (
                                      <tr key={sim.id}>
                                        
                                        <td className="px-2 py-1">{sim.numero_linea}</td>
                                        <td className="px-2 py-1">{sim.iccid}</td>
                                        <td className="px-2 py-1">{sim.estado}</td>
                                        <td className="border px-2 py-1">
                                          {new Date(sim.fecha_registro).toLocaleString("es-CO", {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>


</TabsContent>



          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            {/* ====== RECARGAS (WINRED) ====== */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recargas (Winred)</span>

                  {/* Saldos Winred */}
                  <div className="text-sm">
                    <Badge variant="outline" className="mr-2">
                      Saldo: {winredBalance?.balance !== null && winredBalance?.balance !== undefined
                        ? formatPrice(winredBalance.balance)
                        : "—"}
                    </Badge>
                    <Badge variant="outline">
                      Descuentos: {winredBalance?.discount !== null && winredBalance?.discount !== undefined
                        ? formatPrice(winredBalance.discount)
                        : "—"}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* ------- Filtros / Selecciones (Lote) ------- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Lote */}
                  <div className="col-span-1">
                    <Label className="mb-1 block">Lote a recargar</Label>
                    <Select value={loteParaRecargar || ""} onValueChange={setLoteParaRecargar}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un lote" />
                      </SelectTrigger>
                      <SelectContent>
                        {lotes.map(l => (
                          <SelectItem key={String(l.lote_id)} value={String(l.lote_id)}>
                            {l.lote_id} — {l.operador} ({l.total_sims} SIMs)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Operador (filtra paquetes) */}
                  <div className="col-span-1">
                    <Label className="mb-1 block">Operador</Label>
                    <Select
                      defaultValue="1"
                      onValueChange={(v) => {
                        const id = Number(v) || 0; // 0=Todos, 1=Claro, 2=Movistar, 3=Tigo
                        // Limpia ambos selects para que sean independientes
                        setSelectedPackageBulkId("");
                        setSelectedPackageSingleId("");
                        fetchWinredPackages(id);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Todos</SelectItem>
                        <SelectItem value="1">CLARO</SelectItem>
                        <SelectItem value="2">MOVISTAR</SelectItem>
                        <SelectItem value="3">TIGO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Paquete Winred (para LOTE) */}
                  <div className="col-span-1">
                    <Label className="mb-1 block">Paquete Winred</Label>
                    <Select value={selectedPackageBulkId} onValueChange={setSelectedPackageBulkId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un paquete" />
                      </SelectTrigger>
                      <SelectContent>
                        {(winredPackages || []).map(p => (
                          <SelectItem key={String(p.product_id)} value={String(p.product_id)}>
                            {`${p.name} — ${formatPrice(Number(p.price))}${p.validity ? ` [${p.validity}]` : ""}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Para paquetes, Winred requiere <b>amount=0</b>. El cargo se hace con el <b>product_id</b> del paquete.
                    </p>
                  </div>
                </div>

                {/* Acción Lote */}
                <div className="flex items-center justify-end">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setTipoRecarga('lote');
                      setParamsRecarga({
                        lote_id: loteParaRecargar,
                        product_id: Number(selectedPackageBulkId),
                        amount: 0,
                        sell_from: "S",
                      });
                      setShowRecargaModal(true);
                    }}
                    disabled={!loteParaRecargar || !selectedPackageBulkId}
                    title={!loteParaRecargar || !selectedPackageBulkId ? "Selecciona lote y paquete" : ""}
                  >
                    Recargar lote seleccionado
                  </Button>
                </div>

                <Separator className="my-2" />

                {/* ------- RECARGA INDIVIDUAL ------- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* Número a recargar */}
                  <div className="col-span-1">
                    <Label className="mb-1 block">Número / Suscriber</Label>
                    <Input
                      placeholder="Ej: 3181234567"
                      value={msisdnToTopup}
                      onChange={(e) => setMsisdnToTopup(e.target.value.replace(/[^\d]/g, ""))}
                      maxLength={15}
                    />
                  </div>

                  {/* Paquete (Individual) */}
                  <div className="col-span-1">
                    <Label className="mb-1 block">Paquete</Label>
                    <Select value={selectedPackageSingleId} onValueChange={setSelectedPackageSingleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un paquete" />
                      </SelectTrigger>
                      <SelectContent>
                        {(winredPackages || []).map(p => (
                          <SelectItem key={String(p.product_id)} value={String(p.product_id)}>
                            {`${p.name} — ${formatPrice(Number(p.price))}${p.validity ? ` [${p.validity}]` : ""}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Botón Individual */}
                  <div className="col-span-1 flex justify-end">
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={!msisdnToTopup || !selectedPackageSingleId}
                      onClick={() => {
                        setTipoRecarga('individual');
                        setParamsRecarga({
                          product_id: Number(selectedPackageSingleId),
                          amount: 0,
                          subscriber: msisdnToTopup,
                          sell_from: "S",
                        });
                        setShowRecargaModal(true);
                      }}
                    >
                      Recargar número
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

                   {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* ===== KPIs (cards) ===== */}
            {dashboardStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <div className="flex items-center space-x-4">
                    <DollarSign className="w-10 h-10" />
                    <div>
                      <p className="text-blue-100">Ingresos Total</p>
                      <p className="text-2xl font-bold">
                        {formatPrice(dashboardStats?.sales?.revenue_total || 0)}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <div className="flex items-center space-x-4">
                    <Activity className="w-10 h-10" />
                    <div>
                      <p className="text-green-100">Ventas Total</p>
                      <p className="text-2xl font-bold">
                        {dashboardStats?.sales?.ventas_total || 0}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <div className="flex items-center space-x-4">
                    <Package className="w-10 h-10" />
                    <div>
                      <p className="text-purple-100">SIMs Disponibles</p>
                      <p className="text-2xl font-bold">
                        {dashboardStats?.sims?.available || 0}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <div className="flex items-center space-x-4">
                    <AlertTriangle className="w-10 h-10" />
                    <div>
                      <p className="text-orange-100">Alertas</p>
                      <p className="text-2xl font-bold">
                        {(dashboardStats?.alerts?.low_stock_operators || []).length}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <p className="text-center text-gray-500">Cargando dashboard...</p>
            )}

            {/* ===== Filtros (rango de fechas + cierres con diferencia) ===== */}
            <Card className="mb-2">
              <CardContent className="flex flex-wrap gap-3 items-end pt-4">
                <div>
                  <Label>Desde</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label>Hasta</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <input id="onlyDiffs" type="checkbox" checked={onlyDiffs} onChange={e => setOnlyDiffs(e.target.checked)} />
                  <Label htmlFor="onlyDiffs">Sólo cierres con diferencia</Label>
                </div>
                <Button onClick={fetchAnalytics}>Aplicar</Button>
              </CardContent>
            </Card>

            {/* ===== Métricas por periodo ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-2">
              <Card className="p-4">
                <CardHeader><CardTitle>Hoy</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500">Ingresos</div>
                  <div className="text-2xl font-semibold">{formatPrice(dashboardStats?.sales?.revenue_hoy || 0)}</div>
                  <div className="text-sm mt-1">Ventas</div>
                  <div className="text-xl">{dashboardStats?.sales?.ventas_hoy || 0}</div>
                  <div className="text-sm mt-1">Ticket Prom.</div>
                  <div className="text-xl">{formatPrice(dashboardStats?.sales?.ticket_prom_hoy || 0)}</div>
                </CardContent>
              </Card>

              <Card className="p-4">
                <CardHeader><CardTitle>Mes</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500">Ingresos</div>
                  <div className="text-2xl font-semibold">{formatPrice(dashboardStats?.sales?.revenue_mes || 0)}</div>
                  <div className="text-sm mt-1">Ventas</div>
                  <div className="text-xl">{dashboardStats?.sales?.ventas_mes || 0}</div>
                  <div className="text-sm mt-1">Ticket Prom.</div>
                  <div className="text-xl">{formatPrice(dashboardStats?.sales?.ticket_prom_mes || 0)}</div>
                </CardContent>
              </Card>

              <Card className="p-4">
                <CardHeader><CardTitle>Por método</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div>Cash: <b>{formatPrice(dashboardStats?.sales?.by_method?.cash || 0)}</b></div>
                  <div>Electronic: <b>{formatPrice(dashboardStats?.sales?.by_method?.electronic || 0)}</b></div>
                  <div>Datáfono: <b>{formatPrice(dashboardStats?.sales?.by_method?.card || 0)}</b></div>
                </CardContent>
              </Card>

              <Card className="p-4">
                <CardHeader><CardTitle>Stock</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div>Total SIMs: <b>{dashboardStats?.sims?.total || 0}</b></div>
                  <div>Disponibles: <b>{dashboardStats?.sims?.available || 0}</b></div>
                  <div>Vendidas: <b>{dashboardStats?.sims?.sold || 0}</b></div>
                </CardContent>
              </Card>
            </div>

            {/* ===== Gráficos: Tendencia y Torta ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tendencia ventas por día */}
              <Card>
                <CardHeader><CardTitle>Tendencia (Ventas por día)</CardTitle></CardHeader>
                <CardContent style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.ventas_por_dia || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="ventas" name="# Ventas" />
                      {/* Si quieres también graficar el ingreso:
                      <Line type="monotone" dataKey="total" name="Ingresos" />
                      */}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Torta por tipo de producto */}
              <Card>
                <CardHeader><CardTitle>Ventas por tipo de producto</CardTitle></CardHeader>
                <CardContent style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.ventas_por_producto || []}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        label
                      >
                        {(analytics?.ventas_por_producto || []).map((_, i) => (
                          <Cell key={i} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* ===== Gráfico: Ventas por usuario ===== */}
            <Card>
              <CardHeader><CardTitle>Ventas por usuario</CardTitle></CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.ventas_por_usuario || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="usuario" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ventas" name="# Ventas" />
                    {/* opcional: <Bar dataKey="total" name="Ingresos" /> */}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* ===== Cierres de caja (detalle + observaciones) ===== */}
            <Card>
              <CardHeader><CardTitle>Cierres de caja (rango seleccionado)</CardTitle></CardHeader>
              <CardContent className="overflow-auto">
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-2 py-1">Fecha cierre</th>
                      <th className="border px-2 py-1">Asesor</th>
                      <th className="border px-2 py-1">Electrón.</th>
                      <th className="border px-2 py-1">Efectivo</th>
                      <th className="border px-2 py-1">Datafono</th>
                      <th className="border px-2 py-1">Efectivo reportado</th>
                      <th className="border px-2 py-1">Diferencia</th>
                      <th className="border px-2 py-1">Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.cierres || []).map((c) => (
                      <tr key={c.cierre_id}>
                        <td className="border px-2 py-1">{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString() : '-'}</td>
                        <td className="border px-2 py-1">{c.asesor || '—'}</td>
                        <td className="border px-2 py-1">{formatPrice(c.total_ventas_electronicas)}</td>
                        <td className="border px-2 py-1">{formatPrice(c.total_ventas_efectivo)}</td>
                        <td className="border px-2 py-1">{formatPrice(c.total_ventas_datafono)}</td>
                        <td className="border px-2 py-1">{formatPrice(c.efectivo_reportado)}</td>
                        <td className={`border px-2 py-1 font-semibold ${c.diferencia !== 0 ? 'text-red-600' : ''}`}>
                          {formatPrice(c.diferencia)}
                        </td>
                        <td className="border px-2 py-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">Ver</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Detalle de observación</DialogTitle>
                                <DialogDescription>
                                  <div className="mt-2 space-y-2 text-sm">
                                    <div><b>Asesor:</b> {c.asesor || '—'}</div>
                                    <div><b>Turno:</b> {c.turno_id}</div>
                                    <div className="whitespace-pre-wrap"><b>Observaciones:</b><br />{c.observaciones || '—'}</div>
                                  </div>
                                </DialogDescription>
                              </DialogHeader>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* ===== Últimos movimientos ===== */}
            <Card>
              <CardHeader><CardTitle>Últimos movimientos</CardTitle></CardHeader>
              <CardContent className="overflow-auto">
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-2 py-1">Fecha</th>
                      <th className="border px-2 py-1">Método</th>
                      <th className="border px-2 py-1">Monto</th>
                      <th className="border px-2 py-1">Sale ID</th>
                      <th className="border px-2 py-1">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardStats?.sales?.ultimas_ventas || []).map((m, i) => (
                      <tr key={i}>
                        <td className="border px-2 py-1">{m.fecha ? new Date(m.fecha).toLocaleString() : "-"}</td>
                        <td className="border px-2 py-1">{m.metodo || "-"}</td>
                        <td className="border px-2 py-1 font-semibold">{formatPrice(m.monto || 0)}</td>
                        <td className="border px-2 py-1 text-xs">{m.sale_id || "-"}</td>
                        <td className="border px-2 py-1 text-xs">{m.descripcion || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* ===== Alertas de stock bajo ===== */}
            {(dashboardStats?.alerts?.low_stock_by_plan || []).length > 0 && (
              <Card className="mt-6">
                <CardHeader><CardTitle>Alertas: poco stock por plan</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  <ul className="list-disc ml-5">
                    {dashboardStats.alerts.low_stock_by_plan.map((a, i) => (
                      <li key={i}>{a.plan}: {a.disponibles} disponibles</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        <TabsContent value="users" className="space-y-6">
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Gestión de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Button onClick={() => openUserForm()} className="bg-blue-600 hover:bg-blue-700">
                Crear Usuario
              </Button>
            </div>

            <table className="min-w-full border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2">Usuario</th>
                  <th className="border px-4 py-2">Nombre Completo</th>
                  <th className="border px-4 py-2">Email</th>
                  <th className="border px-4 py-2">Rol</th>
                  <th className="border px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="border px-4 py-2">{u.username}</td>
                    <td className="border px-4 py-2">{u.full_name}</td>
                    <td className="border px-4 py-2">{u.email}</td>
                    <td className="border px-4 py-2">{u.role}</td>
                    <td className="border px-4 py-2 space-x-2">
                      <Button size="sm" onClick={() => openUserForm(u)}>Editar</Button>
                      <Button size="sm" className="bg-red-500" onClick={() => deleteUser(u.id)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Editar Usuario" : "Crear Usuario"}</DialogTitle>
                  <DialogDescription>
                    Completa los datos y guarda los cambios.
                  </DialogDescription>
                </DialogHeader>

                {/* Crear: Usuario */}
                {!editingUser && (
                  <>
                    <div className="space-y-2">
                      <Label>Usuario</Label>
                      <Input
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                      />
                    </div>

                    {/* Crear: Contraseña + Confirmación */}
                    <div className="space-y-2">
                      <Label>Contraseña</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmar Contraseña</Label>
                      <Input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* Editar: restablecer contraseña opcional */}
                {editingUser && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={changePwd}
                        onChange={(e) => setChangePwd(e.target.checked)}
                      />
                      Restablecer contraseña
                    </Label>

                    {changePwd && (
                      <>
                        <div className="space-y-2">
                          <Label>Nueva contraseña</Label>
                          <Input
                            type="password"
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Confirmar contraseña</Label>
                          <Input
                            type="password"
                            value={confirmPwd}
                            onChange={(e) => setConfirmPwd(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Comunes: nombre, email, rol */}
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select
                    value={formData.role_id}
                    onValueChange={value => setFormData({ ...formData, role_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowUserForm(false)}>Cancelar</Button>
                  <Button className="bg-blue-600" onClick={saveUser}>
                    {editingUser ? "Guardar cambios" : "Crear Usuario"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </TabsContent>

      
      <TabsContent value="turnos" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna 1-2: listado de turnos */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm lg:col-span-1">
            <CardHeader>
              <CardTitle>Mis turnos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingTurnos ? (
                <p className="text-gray-500">Cargando...</p>
              ) : misTurnos.length === 0 ? (
                <p className="text-gray-500">No hay turnos.</p>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-auto">
                  {misTurnos.map(t => (
                    <button
                      key={t.turno_id}
                      onClick={() => {
                        setTurnoSeleccionado(t);
                        fetchMovimientosDeTurno(t.turno_id);
                      }}
                      className={`w-full text-left p-3 rounded border transition ${
                        turnoSeleccionado?.turno_id === t.turno_id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold">Turno {t.turno_id.slice(0,8)}…</span>
                        <span className={`text-xs ${t.estado === 'abierto' ? 'text-green-600' : 'text-gray-600'}`}>
                          {t.estado.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Apertura: {new Date(t.fecha_apertura).toLocaleString()}
                        {t.fecha_cierre && <> · Cierre: {new Date(t.fecha_cierre).toLocaleString()}</>}
                      </div>
                      <div className="mt-1 text-sm">
                        Ventas: <b>{t.ventas}</b> · Total: <b>{formatPrice(t.total_general)}</b>
                      </div>
                      <div className="text-xs text-gray-600">
                        Efectivo: {formatPrice(t.total_efectivo)} · Electrónicas: {formatPrice(t.total_electronicas)} · Datáfono: {formatPrice(t.total_datafono)}
                      </div>

                      {/* >>> NUEVO: línea corta con observaciones en la tarjeta */}
                      <div className="mt-1 text-xs text-gray-500 truncate">
                        Obs: {t.observaciones ?? t.observaciones_cierre ?? '—'}
                      </div>
                      {/* <<< NUEVO */}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Columna 3: detalle de movimientos */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {turnoSeleccionado ? (
                  <>Detalle del turno {turnoSeleccionado.turno_id.slice(0,8)}…</>
                ) : (
                  <>Selecciona un turno</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!turnoSeleccionado ? (
                <p className="text-gray-500">Elige un turno del panel izquierdo para ver el detalle.</p>
              ) : (
                <>
                  {/* >>> NUEVO: bloque de Observaciones del cierre */}
                  {(turnoSeleccionado.observaciones || turnoSeleccionado.observaciones_cierre) && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg border">
                      <div className="text-sm text-slate-500 mb-1">Observaciones del cierre</div>
                      <div className="text-slate-800 whitespace-pre-wrap">
                        {turnoSeleccionado.observaciones || turnoSeleccionado.observaciones_cierre}
                      </div>
                    </div>
                  )}
                  {/* <<< NUEVO */}

                  {movimientosTurno.length === 0 ? (
                    <p className="text-gray-500">Sin movimientos.</p>
                  ) : (
                    <div className="overflow-auto">
                      <table className="min-w-full border border-gray-200 text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border px-2 py-1">Fecha</th>
                            <th className="border px-2 py-1">Descripción</th>
                            <th className="border px-2 py-1">Método</th>
                            <th className="border px-2 py-1">Monto</th>
                            <th className="border px-2 py-1">Sale ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movimientosTurno.map(m => (
                            <tr key={m.id}>
                              <td className="border px-2 py-1">
                                {new Date(m.fecha).toLocaleString()}
                              </td>
                              <td className="border px-2 py-1">{m.descripcion || "-"}</td>
                              <td className="border px-2 py-1">{m.metodo_pago}</td>
                              <td className="border px-2 py-1 font-semibold">{formatPrice(m.monto)}</td>
                              <td className="border px-2 py-1 text-xs">{m.sale_id || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      
        </Tabs>
      </div>

      {/* Modal de Cierre de Caja */}
      <Dialog open={showCierreModal} onOpenChange={setShowCierreModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Cierre de Caja</DialogTitle>
            <DialogDescription>
              Resumen del turno - {turnoAbierto && new Date(turnoAbierto.fecha_apertura).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          
          {resumenCierre && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700">Fecha Apertura</h3>
                  <p className="text-lg font-bold">{new Date(resumenCierre.fecha_apertura).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800">Ventas Electrónicas</h3>
                  <p className="text-lg font-bold">{formatPrice(resumenCierre.total_ventas_electronicas)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <h3 className="text-sm font-medium text-green-800">Ventas Efectivo</h3>
                  <p className="text-lg font-bold">{formatPrice(resumenCierre.total_ventas_efectivo)}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-800">Ventas Datafono</h3>
                  <p className="text-lg font-bold">{formatPrice(resumenCierre.total_ventas_datafono)}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Total Esperado en Caja:</Label>
                  <span className="font-semibold">{formatPrice(totalEsperado)}</span>
                </div>
                
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Ventas Electrónicas Reportadas
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={ventasElectronicasInput}
                    onChange={(e) => setVentasElectronicasInput(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Ventas con Datafono Reportadas
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={ventasDatafonoInput}
                    onChange={(e) => setVentasDatafonoInput(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>


                <div className="space-y-1">
                  <Label htmlFor="efectivo">Ventas Efectivo Reportadas</Label>
                  <input
                    id="efectivo"
                    type="text"
                    inputMode="decimal"
                    value={efectivoReportado}
                    onChange={(e) => setEfectivoReportado(e.target.value)}
                    placeholder="Ingrese el monto en caja"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Input
                    id="observaciones"
                    value={observacionesCierre}
                    onChange={(e) => setObservacionesCierre(e.target.value)}
                    placeholder="Notas sobre el cierre"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowCierreModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={cerrarTurno}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirmar Cierre
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación y progreso de recarga */}
      <Dialog open={showRecargaModal} onOpenChange={setShowRecargaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar recarga</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea realizar esta recarga {tipoRecarga === 'lote' ? 'masiva al lote seleccionado' : 'al número seleccionado'}?
            </DialogDescription>
          </DialogHeader>
          {recargaEnProgreso ? (
            <div className="space-y-4">
              <p>Recargando... Por favor espere.</p>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all"
                  style={{ width: `${recargaProgreso}%` }}
                ></div>
              </div>
              <p className="text-center">{recargaProgreso}%</p>
            </div>
          ) : (
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRecargaModal(false)}>Cancelar</Button>
              <Button className="bg-green-600" onClick={async () => {
                setRecargaEnProgreso(true);
                setRecargaProgreso(0);
                try {
                  if (tipoRecarga === 'lote') {
                    // Simula progreso para recarga masiva
                    setRecargaProgreso(10);
                    const { lote_id, product_id, amount, sell_from } = paramsRecarga;
                    // Llama a la función de recarga masiva y actualiza el progreso
                    const res = await recargaMasivaPorLote({ lote_id, product_id, amount, sell_from, setRecargaProgreso });
                    setRecargaProgreso(100);
                    setTimeout(() => setShowRecargaModal(false), 800);
                  } else if (tipoRecarga === 'individual') {
                    setRecargaProgreso(30);
                    const { product_id, amount, subscriber, sell_from } = paramsRecarga;
                    await recargaIndividual({ product_id, amount, subscriber, sell_from });
                    setRecargaProgreso(100);
                    setTimeout(() => setShowRecargaModal(false), 800);
                  }
                } catch (e) {
                  setRecargaProgreso(0);
                } finally {
                  setRecargaEnProgreso(false);
                  setParamsRecarga(null);
                  setTipoRecarga(null);
                }
              }}>
                Sí, quiero recargar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
        {/* Cierra el contenedor principal (contenido a la derecha) */}
        </div>
      {/* Cierra el contenedor raíz que engloba el menú lateral y el contenido */}
      </div>
    );
}

export default App;