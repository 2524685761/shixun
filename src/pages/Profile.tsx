import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Camera,
  Loader2,
  Save,
  Shield,
} from 'lucide-react';
import { profileFormSchema, validateForm } from '@/lib/validations';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  student_id: string | null;
  employee_id: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    student_id: '',
    employee_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          student_id: data.student_id || '',
          employee_id: data.employee_id || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('获取个人信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setErrors({});

    const validation = validateForm(profileFormSchema, {
      fullName: formData.full_name,
      phone: formData.phone || undefined,
      studentId: formData.student_id || undefined,
      employeeId: formData.employee_id || undefined,
    });

    if (validation.success === false) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, string | null> = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
      };

      if (role === 'student') {
        updateData.student_id = formData.student_id.trim() || null;
      } else {
        updateData.employee_id = formData.employee_id.trim() || null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('个人信息已更新');
      fetchProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 验证文件大小 (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // 上传文件
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 获取公共URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 更新profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('头像已更新');
      fetchProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || '上传失败');
    } finally {
      setUploading(false);
      // 清空input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const roleLabels = {
    student: '学生',
    teacher: '教师',
    admin: '管理员',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          个人资料
        </h1>
        <p className="text-muted-foreground mt-1">
          管理您的个人信息和账号设置
        </p>
      </div>

      {/* 头像卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">头像</CardTitle>
          <CardDescription>点击头像更换照片</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {formData.full_name?.slice(0, 1) || user?.email?.slice(0, 1)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div 
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleAvatarClick}
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploading}
              />
            </div>
            <div>
              <p className="font-medium">{formData.full_name || '未设置姓名'}</p>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {role && roleLabels[role]}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 基本信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本信息</CardTitle>
          <CardDescription>更新您的个人基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              邮箱
            </Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">邮箱地址不可修改</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              姓名 *
            </Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="请输入您的姓名"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              手机号码
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="请输入手机号码"
            />
          </div>

          {role === 'student' ? (
            <div className="space-y-2">
              <Label htmlFor="student_id" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                学号
              </Label>
              <Input
                id="student_id"
                value={formData.student_id}
                onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                placeholder="请输入学号"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="employee_id" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                工号
              </Label>
              <Input
                id="employee_id"
                value={formData.employee_id}
                onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                placeholder="请输入工号"
              />
            </div>
          )}

          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="gradient-primary text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              保存修改
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
