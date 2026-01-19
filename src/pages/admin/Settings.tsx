import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  Settings,
  Clock,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  AlertCircle,
} from 'lucide-react';

interface CommentTemplate {
  id: string;
  content: string;
  category: string;
  is_system: boolean;
}

const categories = [
  { value: 'excellent', label: '优秀' },
  { value: 'good', label: '良好' },
  { value: 'average', label: '一般' },
  { value: 'poor', label: '需改进' },
];

export default function AdminSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CommentTemplate[]>([]);
  
  // 评语模板编辑状态
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommentTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    content: '',
    category: 'excellent',
  });
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // 打卡时间配置
  const [checkInConfig, setCheckInConfig] = useState({
    lateThreshold: 15, // 迟到阈值（分钟）
    enableWeekend: false, // 是否启用周末打卡
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 获取系统级评语模板
      const { data: templatesData, error } = await supabase
        .from('comment_templates')
        .select('*')
        .eq('is_system', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTemplateDialog = (template?: CommentTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        content: template.content,
        category: template.category,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ content: '', category: 'excellent' });
    }
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.content.trim()) {
      toast.error('请输入评语内容');
      return;
    }

    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        // 更新
        const { error } = await supabase
          .from('comment_templates')
          .update({
            content: templateForm.content.trim(),
            category: templateForm.category,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('评语模板已更新');
      } else {
        // 创建
        const { error } = await supabase
          .from('comment_templates')
          .insert({
            content: templateForm.content.trim(),
            category: templateForm.category,
            is_system: true,
            teacher_id: null,
          });

        if (error) throw error;
        toast.success('评语模板已创建');
      }

      setTemplateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || '保存失败');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('确定要删除这个评语模板吗？')) return;

    try {
      const { error } = await supabase
        .from('comment_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('评语模板已删除');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.message || '删除失败');
    }
  };

  const getCategoryLabel = (value: string) => {
    return categories.find(c => c.value === value)?.label || value;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'excellent':
        return 'bg-success/10 text-success';
      case 'good':
        return 'bg-primary/10 text-primary';
      case 'average':
        return 'bg-warning/10 text-warning';
      case 'poor':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
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
          <Settings className="h-6 w-6 text-primary" />
          系统设置
        </h1>
        <p className="text-muted-foreground mt-1">
          管理系统级配置和模板
        </p>
      </div>

      {/* 打卡规则配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            打卡规则
          </CardTitle>
          <CardDescription>配置学生打卡相关规则</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>迟到阈值（分钟）</Label>
              <p className="text-sm text-muted-foreground">
                超过任务开始时间多少分钟算迟到
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={checkInConfig.lateThreshold}
                onChange={(e) => setCheckInConfig({
                  ...checkInConfig,
                  lateThreshold: parseInt(e.target.value) || 0
                })}
                className="w-20"
                min={0}
                max={60}
              />
              <span className="text-sm text-muted-foreground">分钟</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>周末打卡</Label>
              <p className="text-sm text-muted-foreground">
                是否允许周末进行打卡
              </p>
            </div>
            <Switch
              checked={checkInConfig.enableWeekend}
              onCheckedChange={(checked) => setCheckInConfig({
                ...checkInConfig,
                enableWeekend: checked
              })}
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">打卡规则配置功能开发中，敬请期待</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 系统评语模板 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                系统评语模板
              </CardTitle>
              <CardDescription>所有教师可用的通用评语模板</CardDescription>
            </div>
            <Button onClick={() => handleOpenTemplateDialog()} className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              添加模板
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无系统评语模板</p>
              <p className="text-sm mt-1">点击"添加模板"创建通用评语</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div 
                  key={template.id}
                  className="flex items-start justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getCategoryColor(template.category)}>
                        {getCategoryLabel(template.category)}
                      </Badge>
                    </div>
                    <p className="text-sm">{template.content}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenTemplateDialog(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 评语模板编辑弹窗 */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? '编辑评语模板' : '添加评语模板'}
            </DialogTitle>
            <DialogDescription>
              系统评语模板对所有教师可见
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>分类</Label>
              <Select
                value={templateForm.category}
                onValueChange={(value) => setTemplateForm({ ...templateForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>评语内容 *</Label>
              <Textarea
                value={templateForm.content}
                onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                placeholder="请输入评语内容..."
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={savingTemplate || !templateForm.content.trim()}
              className="gradient-primary text-white"
            >
              {savingTemplate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
