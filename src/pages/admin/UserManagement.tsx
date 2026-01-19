import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  Mail,
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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          用户管理
        </h1>
        <p className="text-muted-foreground mt-1">
          管理系统用户账号和权限
        </p>
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
    </div>
  );
}
