import React, { useState, useEffect } from 'react';
import { User, UserPlus, Users, Shield, Mail, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { usersService } from '../../services/usersService';
import { useApp } from '../../context/AppContext';

const UsersManagement = () => {
  const { showNotification, loading, setLoading } = useApp();

  // Users and roles state
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  // Form state
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    email: '',
    role_id: ''
  });

  // Password change
  const [changePwd, setChangePwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await usersService.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showNotification('Error al cargar usuarios', 'error');
      setUsers([]);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await usersService.getRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    }
  };

  const openUserForm = (user = null) => {
    setEditingUser(user);

    if (user) {
      // Editar - encontrar el role_id correcto
      const resolvedRoleId =
        roles.find(r => r.name === user.role)?.id ??
        (user.role_id ?? "");

      setFormData({
        username: user.username ?? "",
        password: "",
        confirmPassword: "",
        full_name: user.full_name ?? "",
        email: user.email ?? "",
        role_id: resolvedRoleId ? String(resolvedRoleId) : ""
      });
    } else {
      // Crear - usar primer rol como default
      const defaultRoleId = roles[0]?.id ? String(roles[0].id) : "";
      setFormData({
        username: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        email: "",
        role_id: defaultRoleId
      });
    }

    setChangePwd(false);
    setNewPwd('');
    setShowUserForm(true);
  };

  const saveUser = async () => {
    try {
      setLoading(true);

      if (editingUser) {
        // Actualizar usuario existente
        await usersService.updateUser(editingUser.id, {
          full_name: formData.full_name,
          email: formData.email,
          role_id: formData.role_id
        });

        // Cambiar contraseña si se solicitó
        if (changePwd) {
          if (!newPwd || newPwd.length < 6) {
            showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
          }
          await usersService.changePassword(editingUser.id, newPwd);
        }

        showNotification('Usuario actualizado correctamente', 'success');
      } else {
        // Crear nuevo usuario
        if (!formData.username || !formData.password || !formData.full_name || !formData.email) {
          showNotification('Completa todos los campos obligatorios', 'error');
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          showNotification('Las contraseñas no coinciden', 'error');
          return;
        }

        if (formData.password.length < 6) {
          showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
          return;
        }

        await usersService.createUser({
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          email: formData.email,
          role_id: formData.role_id
        });

        showNotification('Usuario creado correctamente', 'success');
      }

      // Refresh users list
      await fetchUsers();

      // Close modal
      setShowUserForm(false);
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        email: '',
        role_id: ''
      });
    } catch (error) {
      console.error('Error saving user:', error);
      const msg = error?.response?.data?.detail || 'Error al guardar usuario';
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;

    try {
      await usersService.deleteUser(userId);
      showNotification('Usuario eliminado correctamente', 'success');
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      const msg = error?.response?.data?.detail || 'Error al eliminar usuario';
      showNotification(msg, 'error');
    }
  };

  // Calculate statistics
  const totalUsers = users.length;
  const usersByRole = roles.reduce((acc, role) => {
    acc[role.name] = users.filter(u => u.role === role.name).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-localsim-teal-600 to-localsim-teal-500 bg-clip-text text-transparent">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 mt-1">Administra usuarios y sus roles en el sistema</p>
        </div>
        <Button
          onClick={() => openUserForm()}
          className="flex items-center gap-2 bg-gradient-to-r from-localsim-teal-600 to-localsim-teal-500 hover:from-localsim-teal-700 hover:to-localsim-teal-600 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <UserPlus className="h-4 w-4" />
          Crear Usuario
        </Button>
      </div>

      {/* KPIs */}
      {users.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-500 to-indigo-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Total Usuarios</p>
                  <h3 className="text-3xl font-bold text-white mt-1">{totalUsers}</h3>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {roles.slice(0, 3).map((role, index) => {
            const colors = [
              'from-green-500 to-emerald-600',
              'from-orange-500 to-orange-600',
              'from-purple-500 to-purple-600'
            ];
            return (
              <Card key={role.id} className={`border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br ${colors[index]}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm font-medium">{role.name}</p>
                      <h3 className="text-3xl font-bold text-white mt-1">{usersByRole[role.name] || 0}</h3>
                    </div>
                    <div className="bg-white/20 p-3 rounded-lg">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Users Table */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="bg-gradient-to-r from-localsim-teal-50 to-cyan-50 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-localsim-teal-600 to-localsim-teal-500 p-2 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-localsim-teal-700">Lista de Usuarios</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">

          {users.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-localsim-teal-100 to-cyan-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-localsim-teal-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay usuarios registrados
              </h3>
              <p className="text-gray-600">Crea el primer usuario para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Usuario
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nombre Completo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Rol
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-localsim-teal-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="bg-localsim-teal-100 p-2 rounded-full">
                            <User className="w-4 h-4 text-localsim-teal-600" />
                          </div>
                          <span className="font-medium text-gray-900">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {u.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className="bg-gradient-to-r from-localsim-teal-500 to-localsim-teal-600 text-white border-0">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => openUserForm(u)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                            onClick={() => deleteUser(u.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Crear/Editar Usuario */}
      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuario" : "Crear Usuario"}</DialogTitle>
            <DialogDescription>
              Completa los datos y guarda los cambios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Username (solo para crear) */}
            {!editingUser && (
              <div className="space-y-2">
                <Label>Usuario *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Nombre de usuario"
                />
              </div>
            )}

            {/* Password (solo para crear) */}
            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label>Contraseña *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Contraseña *</Label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Repite la contraseña"
                  />
                </div>
              </>
            )}

            {/* Change password (solo para editar) */}
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
                  <div className="space-y-2">
                    <Label>Nueva contraseña</Label>
                    <Input
                      type="password"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <Label>Nombre Completo *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nombre y apellidos"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@empresa.com"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={formData.role_id} onValueChange={(value) => setFormData({ ...formData, role_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={saveUser}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Guardando...' : 'Guardar Usuario'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUserForm(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;