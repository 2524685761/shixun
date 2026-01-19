import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
} from 'lucide-react';

interface ImportUser {
  email: string;
  full_name: string;
  role: 'student' | 'teacher';
  student_id?: string;
  employee_id?: string;
  phone?: string;
  password?: string;
  status?: 'pending' | 'success' | 'error';
  error?: string;
}

interface BatchImportUsersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

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

export function BatchImportUsers({ open, onOpenChange, onSuccess }: BatchImportUsersProps) {
  const [users, setUsers] = useState<ImportUser[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportUser[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

      if (jsonData.length === 0) {
        toast.error('Excel文件为空');
        return;
      }

      // 解析数据
      const parsedUsers: ImportUser[] = jsonData.map((row) => ({
        email: String(row['邮箱'] || row['email'] || '').trim(),
        full_name: String(row['姓名'] || row['full_name'] || '').trim(),
        role: (String(row['角色'] || row['role'] || '').toLowerCase() === 'teacher' || 
               String(row['角色'] || row['role'] || '').includes('教师')) ? 'teacher' : 'student',
        student_id: String(row['学号'] || row['student_id'] || '').trim() || undefined,
        employee_id: String(row['工号'] || row['employee_id'] || '').trim() || undefined,
        phone: String(row['电话'] || row['phone'] || '').trim() || undefined,
        password: generatePassword(),
        status: 'pending',
      }));

      // 验证必填字段
      const validUsers = parsedUsers.filter(u => u.email && u.full_name);
      
      if (validUsers.length === 0) {
        toast.error('没有有效的用户数据，请检查Excel格式');
        return;
      }

      setUsers(validUsers);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast.error('解析Excel文件失败');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setStep('importing');
    setProgress(0);

    const results: ImportUser[] = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      try {
        // 创建用户
        const { data, error } = await supabase.auth.signUp({
          email: user.email,
          password: user.password!,
          options: {
            data: {
              full_name: user.full_name,
              role: user.role,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // 创建角色
          await supabase.from('user_roles').insert({
            user_id: data.user.id,
            role: user.role,
          });

          // 创建资料
          await supabase.from('profiles').insert({
            user_id: data.user.id,
            full_name: user.full_name,
            student_id: user.role === 'student' ? user.student_id : null,
            employee_id: user.role === 'teacher' ? user.employee_id : null,
            phone: user.phone || null,
          });

          results.push({ ...user, status: 'success' });
        }
      } catch (error: any) {
        results.push({ 
          ...user, 
          status: 'error',
          error: error.message || '创建失败'
        });
      }

      setProgress(Math.round(((i + 1) / users.length) * 100));
    }

    setImportResults(results);
    setImporting(false);
    setStep('results');
    
    const successCount = results.filter(r => r.status === 'success').length;
    if (successCount > 0) {
      toast.success(`成功导入 ${successCount} 个用户`);
      onSuccess();
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        '邮箱': 'student@example.com',
        '姓名': '张三',
        '角色': '学生',
        '学号': '2024001',
        '工号': '',
        '电话': '13800138000',
      },
      {
        '邮箱': 'teacher@example.com',
        '姓名': '李四',
        '角色': '教师',
        '学号': '',
        '工号': 'T001',
        '电话': '13900139000',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '用户模板');
    XLSX.writeFile(wb, '用户导入模板.xlsx');
  };

  const handleDownloadResults = () => {
    const resultsData = importResults.map(r => ({
      '邮箱': r.email,
      '姓名': r.full_name,
      '角色': r.role === 'student' ? '学生' : '教师',
      '初始密码': r.password,
      '导入状态': r.status === 'success' ? '成功' : '失败',
      '错误信息': r.error || '',
    }));

    const ws = XLSX.utils.json_to_sheet(resultsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '导入结果');
    XLSX.writeFile(wb, '用户导入结果.xlsx');
  };

  const handleClose = () => {
    setUsers([]);
    setImportResults([]);
    setStep('upload');
    setProgress(0);
    onOpenChange(false);
  };

  const successCount = importResults.filter(r => r.status === 'success').length;
  const errorCount = importResults.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            批量导入用户
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && '上传Excel文件批量创建用户账号'}
            {step === 'preview' && '预览导入数据，确认后开始导入'}
            {step === 'importing' && '正在导入用户...'}
            {step === 'results' && '导入完成，查看结果'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* 上传区域 */}
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <FileSpreadsheet className="h-12 w-12 mx-auto text-primary mb-4" />
                <p className="font-medium">点击上传Excel文件</p>
                <p className="text-sm text-muted-foreground mt-1">
                  支持 .xlsx, .xls 格式
                </p>
              </div>

              {/* 下载模板 */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium">下载导入模板</p>
                  <p className="text-sm text-muted-foreground">
                    使用标准模板确保数据格式正确
                  </p>
                </div>
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  下载模板
                </Button>
              </div>

              {/* 格式说明 */}
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-medium mb-2">Excel格式要求</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>邮箱</strong>（必填）：用户登录邮箱</li>
                  <li>• <strong>姓名</strong>（必填）：用户真实姓名</li>
                  <li>• <strong>角色</strong>：学生 或 教师，默认为学生</li>
                  <li>• <strong>学号</strong>：学生填写</li>
                  <li>• <strong>工号</strong>：教师填写</li>
                  <li>• <strong>电话</strong>：联系电话（可选）</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  共 {users.length} 条记录
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>邮箱</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>学号/工号</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.slice(0, 10).map((user, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{user.email}</TableCell>
                        <TableCell>{user.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.role === 'student' ? '学生' : '教师'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.role === 'student' ? user.student_id : user.employee_id}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {users.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  还有 {users.length - 10} 条记录未显示...
                </p>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">正在导入用户</p>
                <p className="text-sm text-muted-foreground mt-1">
                  请勿关闭此页面
                </p>
              </div>
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  {progress}% 完成
                </p>
              </div>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-4">
              {/* 统计 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-medium">成功</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{successCount}</p>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="font-medium">失败</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{errorCount}</p>
                </div>
              </div>

              {/* 结果列表 */}
              <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>状态</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>初始密码</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResults.map((user, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {user.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{user.email}</TableCell>
                        <TableCell>{user.full_name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {user.status === 'success' ? user.password : user.error}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 下载结果 */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleDownloadResults}
              >
                <Download className="h-4 w-4 mr-2" />
                下载导入结果（含初始密码）
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                返回
              </Button>
              <Button 
                onClick={handleImport}
                className="gradient-primary text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                开始导入 ({users.length})
              </Button>
            </>
          )}
          
          {step === 'results' && (
            <Button onClick={handleClose} className="gradient-primary text-white">
              完成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
