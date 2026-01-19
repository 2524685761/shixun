import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, GraduationCap, Eye, EyeOff, Check, X } from 'lucide-react';
import { registerFormSchema, validateForm } from '@/lib/validations';

// 密码强度检查
const checkPasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  const passedChecks = Object.values(checks).filter(Boolean).length;
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let color = 'bg-destructive';
  
  if (passedChecks >= 4) {
    strength = 'strong';
    color = 'bg-success';
  } else if (passedChecks >= 3) {
    strength = 'medium';
    color = 'bg-warning';
  }
  
  return { checks, passedChecks, strength, color, percentage: (passedChecks / 5) * 100 };
};

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => checkPasswordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = validateForm(registerFormSchema, { 
      email, 
      password, 
      confirmPassword, 
      fullName, 
      studentId: studentId || undefined 
    });
    
    if (validation.success === false) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    if (passwordStrength.strength === 'weak') {
      toast.error('密码强度太弱，请包含大小写字母、数字');
      return;
    }

    setLoading(true);
    
    try {
      // 学生注册，角色固定为 student
      const { error } = await signUp(email, password, fullName, 'student', studentId);
      
      if (error) {
        const errorMessage = error.message.includes('already registered')
          ? '该邮箱已被注册'
          : '注册失败：' + error.message;
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      toast.success('注册成功！请登录');
      navigate('/login');
    } catch (err: any) {
      toast.error('网络错误，请检查网络连接');
      setLoading(false);
    }
  };

  const strengthLabels = {
    weak: '弱',
    medium: '中',
    strong: '强',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-soft relative animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">学生注册</CardTitle>
            <CardDescription className="mt-2">
              注册账号开始实训学习
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">姓名 *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="请输入真实姓名"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                }}
                disabled={loading}
                className={`h-11 ${errors.fullName ? 'border-destructive' : ''}`}
              />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentId">学号</Label>
              <Input
                id="studentId"
                type="text"
                placeholder="请输入学号（可选）"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">邮箱 *</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                disabled={loading}
                className={`h-11 ${errors.email ? 'border-destructive' : ''}`}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码 *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码（至少8位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* 密码强度指示器 */}
              {password && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">密码强度</span>
                    <span className={
                      passwordStrength.strength === 'strong' ? 'text-success' :
                      passwordStrength.strength === 'medium' ? 'text-warning' : 'text-destructive'
                    }>
                      {strengthLabels[passwordStrength.strength]}
                    </span>
                  </div>
                  <Progress 
                    value={passwordStrength.percentage} 
                    className="h-1.5"
                  />
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-success' : 'text-muted-foreground'}`}>
                      {passwordStrength.checks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      至少8位字符
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-success' : 'text-muted-foreground'}`}>
                      {passwordStrength.checks.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      包含小写字母
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-success' : 'text-muted-foreground'}`}>
                      {passwordStrength.checks.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      包含大写字母
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? 'text-success' : 'text-muted-foreground'}`}>
                      {passwordStrength.checks.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      包含数字
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码 *</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="请再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="h-11"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" />
                  两次输入的密码不一致
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 gradient-primary text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>
          </form>

          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <p>💡 提示：教师和管理员账号需由管理员创建，学生可自行注册</p>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            已有账号？{' '}
            <Link 
              to="/login" 
              className="text-primary hover:underline font-medium"
            >
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
