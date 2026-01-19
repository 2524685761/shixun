import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BatchImportUsers } from '@/components/admin/BatchImportUsers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Users, 
  Search,
  GraduationCap,
  UserCog,
  Shield,
  Loader2,
  Plus,
  Edit,
  Eye,
  Check,
  X,
  Copy,
  Upload,
} from 'lucide-react';

interface UserWithProfile {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  profile?: {
    full_name: string;
    student_id: string | null;
    employee_id: string | null;
    phone: string | null;
  };
  created_at: string;
}

const roleLabels = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
};

const roleColors = {
  student: 'bg-primary/10 text-primary',
  teacher: 'bg-success/10 text-success',
  admin: 'bg-warning/10 text-warning',
};

// 密码强度检查
const checkPasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  
  const passedChecks = Object.values(checks).filter(Boolean).length;
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  
  if (passedChecks >= 4) {
    strength = 'strong';
  } else if (passedChecks >= 3) {
    strength = 'medium';
  }
  
  return { checks, passedChecks, strength, percentage: (passedChecks / 4) * 100 };
};

// 生成随机密码
const generatePassword = () => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const all = lowercase + uppercase + numbers;
  
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  for (let i = 0; i < 9; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export default function UserManagement() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [viewingUser, setViewingUser] = useState<UserWithProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    student_id: '',
    employee_id: '',
  });
  const [saving, setSaving] = useState(false);

  // 创建用户相关状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'teacher' as 'student' | 'teacher' | 'admin',
    student_id: '',
    employee_id: '',
    phone: '',
  });
  const [creating, setCreating] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string } | null>(null);
  
  // 批量导入
  const [showBatchImport, setShowBatchImport] = useState(false);

  const passwordStrength = useMemo(() => checkPasswordStrength(createForm.password), [createForm.password]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // 获取所有用户角色
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');

      if (rolesError) throw rolesError;

      // 获取用户资料
      const userIds = rolesData?.map(r => r.user_id) || [];
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, student_id, employee_id, phone')
          .in('user_id', userIds);
        
        profilesData?.forEach(p => {
          profilesMap[p.user_id] = p;
        });
      }

      // 组合用户数据 - 使用 user_id 作为主键
      const usersWithProfiles: UserWithProfile[] = (rolesData || []).map(r => ({
        id: r.user_id,
        email: profilesMap[r.user_id]?.full_name || '未设置',
        role: r.role as 'student' | 'teacher' | 'admin',
        profile: profilesMap[r.user_id] ? {
          full_name: profilesMap[r.user_id].full_name,
          student_id: profilesMap[r.user_id].student_id,
          employee_id: profilesMap[r.user_id].employee_id,
          phone: profilesMap[r.user_id].phone,
        } : undefined,
        created_at: r.created_at,
      }));

      setUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: UserWithProfile) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.profile?.full_name || '',
      phone: user.profile?.phone || '',
      student_id: user.profile?.student_id || '',
      employee_id: user.profile?.employee_id || '',
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone || null,
          student_id: editForm.student_id || null,
          employee_id: editForm.employee_id || null,
        })
        .eq('user_id', editingUser.id);

      if (error) throw error;

      toast.success('用户信息已更新');
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCreateDialog = () => {
    const newPassword = generatePassword();
    setCreateForm({
      email: '',
      password: newPassword,
      full_name: '',
      role: 'teacher',
      student_id: '',
      employee_id: '',
      phone: '',
    });
    setCreatedUser(null);
    setShowCreateDialog(true);
  };

  const handleGeneratePassword = () => {
    setCreateForm(prev => ({ ...prev, password: generatePassword() }));
  };

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      toast.error('请填写所有必填项');
      return;
    }

    if (passwordStrength.strength === 'weak') {
      toast.error('密码强度太弱');
      return;
    }

    setCreating(true);
    try {
      // 使用 Supabase Auth 创建用户
      const { data, error } = await supabase.auth.signUp({
        email: createForm.email,
        password: createForm.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: createForm.full_name,
            role: createForm.role,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // 创建用户角色
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: createForm.role,
          });

        if (roleError) {
          console.error('Error creating user role:', roleError);
        }

        // 创建用户资料
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            full_name: createForm.full_name,
            student_id: createForm.role === 'student' ? createForm.student_id || null : null,
            employee_id: createForm.role !== 'student' ? createForm.employee_id || null : null,
            phone: createForm.phone || null,
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }

        // 显示创建成功信息
        setCreatedUser({
          email: createForm.email,
          password: createForm.password,
        });
        
        toast.success('用户创建成功！');
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesSearch = !searchTerm ||
      user.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profile?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profile?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const studentCount = users.filter(u => u.role === 'student').length;
  const teacherCount = users.filter(u => u.role === 'teacher').length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student':
        return <GraduationCap className="h-4 w-4" />;
      case 'teacher':
        return <UserCog className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            用户管理
          </h1>
          <p className="text-muted-foreground mt-1">
            管理系统用户账号和权限
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowBatchImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            批量导入
          </Button>
          <Button onClick={handleOpenCreateDialog} className="gradient-primary text-white">
            <Plus className="h-4 w-4 mr-2" />
            添加用户
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">学生</p>
                <p className="text-2xl font-bold mt-1">{studentCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">教师</p>
                <p className="text-2xl font-bold mt-1">{teacherCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <UserCog className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">管理员</p>
                <p className="text-2xl font-bold mt-1">{adminCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索姓名、学号或工号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Tabs value={selectedRole} onValueChange={setSelectedRole} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="student">学生</TabsTrigger>
                <TabsTrigger value="teacher">教师</TabsTrigger>
                <TabsTrigger value="admin">管理员</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">用户列表</CardTitle>
          <CardDescription>共 {filteredUsers.length} 个用户</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无用户数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 transition-all"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg font-medium text-primary">
                      {user.profile?.full_name?.slice(0, 1) || '?'}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{user.profile?.full_name || '未设置姓名'}</p>
                      <Badge className={roleColors[user.role]}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1">{roleLabels[user.role]}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {user.role === 'student' && user.profile?.student_id && (
                        <span>学号: {user.profile.student_id}</span>
                      )}
                      {user.role === 'teacher' && user.profile?.employee_id && (
                        <span>工号: {user.profile.employee_id}</span>
                      )}
                      {user.profile?.phone && (
                        <span>电话: {user.profile.phone}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setViewingUser(user)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 查看用户详情弹窗 */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-medium text-primary">
                  {viewingUser?.profile?.full_name?.slice(0, 1) || '?'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-medium">{viewingUser?.profile?.full_name || '未设置姓名'}</h3>
                <Badge className={viewingUser ? roleColors[viewingUser.role] : ''}>
                  {viewingUser && roleLabels[viewingUser.role]}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {viewingUser?.role === 'student' && (
                <div>
                  <Label className="text-muted-foreground">学号</Label>
                  <p className="mt-1">{viewingUser?.profile?.student_id || '未设置'}</p>
                </div>
              )}
              {viewingUser?.role === 'teacher' && (
                <div>
                  <Label className="text-muted-foreground">工号</Label>
                  <p className="mt-1">{viewingUser?.profile?.employee_id || '未设置'}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">电话</Label>
                <p className="mt-1">{viewingUser?.profile?.phone || '未设置'}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑用户弹窗 */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户信息</DialogTitle>
            <DialogDescription>
              修改用户的基本信息
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>
            
            <div className="space-y-2">
              <Label>电话</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="请输入电话号码"
              />
            </div>
            
            {editingUser?.role === 'student' && (
              <div className="space-y-2">
                <Label>学号</Label>
                <Input
                  value={editForm.student_id}
                  onChange={(e) => setEditForm({ ...editForm, student_id: e.target.value })}
                  placeholder="请输入学号"
                />
              </div>
            )}
            
            {editingUser?.role === 'teacher' && (
              <div className="space-y-2">
                <Label>工号</Label>
                <Input
                  value={editForm.employee_id}
                  onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                  placeholder="请输入工号"
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              取消
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="gradient-primary text-white"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建用户弹窗 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdUser ? '用户创建成功' : '添加新用户'}
            </DialogTitle>
            <DialogDescription>
              {createdUser ? '请将以下信息发送给用户' : '创建教师或管理员账号'}
            </DialogDescription>
          </DialogHeader>
          
          {createdUser ? (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">邮箱</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{createdUser.email}</code>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(createdUser.email)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">密码</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{createdUser.password}</code>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(createdUser.password)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                ⚠️ 请妥善保管此信息，密码不会再次显示。建议用户首次登录后修改密码。
              </p>
              
              <Button 
                onClick={() => setShowCreateDialog(false)} 
                className="w-full gradient-primary text-white"
              >
                完成
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>角色 *</Label>
                <Select 
                  value={createForm.role} 
                  onValueChange={(value) => setCreateForm({ ...createForm, role: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        学生
                      </div>
                    </SelectItem>
                    <SelectItem value="teacher">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        教师
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        管理员
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>姓名 *</Label>
                <Input
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>

              <div className="space-y-2">
                <Label>邮箱 *</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="请输入邮箱"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>密码 *</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleGeneratePassword}
                    className="text-xs h-6"
                  >
                    重新生成
                  </Button>
                </div>
                <Input
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="密码"
                />
                {createForm.password && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">密码强度</span>
                      <span className={
                        passwordStrength.strength === 'strong' ? 'text-success' :
                        passwordStrength.strength === 'medium' ? 'text-warning' : 'text-destructive'
                      }>
                        {passwordStrength.strength === 'strong' ? '强' : passwordStrength.strength === 'medium' ? '中' : '弱'}
                      </span>
                    </div>
                    <Progress value={passwordStrength.percentage} className="h-1" />
                  </div>
                )}
              </div>

              {createForm.role === 'student' && (
                <div className="space-y-2">
                  <Label>学号</Label>
                  <Input
                    value={createForm.student_id}
                    onChange={(e) => setCreateForm({ ...createForm, student_id: e.target.value })}
                    placeholder="请输入学号（可选）"
                  />
                </div>
              )}

              {createForm.role !== 'student' && (
                <div className="space-y-2">
                  <Label>工号</Label>
                  <Input
                    value={createForm.employee_id}
                    onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
                    placeholder="请输入工号（可选）"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>电话</Label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="请输入电话（可选）"
                />
              </div>
              
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button 
                  onClick={handleCreateUser}
                  disabled={creating}
                  className="gradient-primary text-white"
                >
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  创建用户
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 批量导入弹窗 */}
      <BatchImportUsers
        open={showBatchImport}
        onOpenChange={setShowBatchImport}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
