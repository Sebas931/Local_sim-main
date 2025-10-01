import React, { useState, useEffect } from 'react';
import { User, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
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

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Gestión de Usuarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button
              onClick={() => openUserForm()}
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Crear Usuario
            </Button>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay usuarios registrados</p>
            </div>
          ) : (
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
                      <Button size="sm" onClick={() => openUserForm(u)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-500 hover:bg-red-600"
                        onClick={() => deleteUser(u.id)}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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