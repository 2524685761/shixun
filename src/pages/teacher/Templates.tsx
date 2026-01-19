import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  BookOpen, 
  Plus,
  Loader2,
  Edit,
  Trash2,
  Copy,
  MessageSquare,
} from 'lucide-react';

interface CommentTemplate {
  id: string;
  content: string;
  category: string;
  is_system: boolean;
  teacher_id: string | null;
}

const CATEGORIES = [
  { value: 'excellent', label: '优秀', color: 'bg-success/10 text-success' },
  { value: 'good', label: '良好', color: 'bg-info/10 text-info' },
  { value: 'average', label: '一般', color: 'bg-warning/10 text-warning' },
  { value: 'needs_improvement', label: '需改进', color: 'bg-destructive/10 text-destructive' },
  { value: 'encouragement', label: '鼓励', color: 'bg-primary/10 text-primary' },
];

export default function Templates() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CommentTemplate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommentTemplate | null>(null);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('excellent');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [user?.id]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('comment_templates')
        .select('*')
        .or(`is_system.eq.true,teacher_id.eq.${user?.id}`)
        .order('category', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('获取模板失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim() || !user?.id) {
      toast.error('请填写评语内容');
      return;
    }

    setSubmitting(true);
    try {
      if (editingTemplate) {
        // 更新
        const { error } = await supabase
          .from('comment_templates')
          .update({ content: content.trim(), category })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('模板已更新');
      } else {
        // 新建
        const { error } = await supabase
          .from('comment_templates')
          .insert({
            content: content.trim(),
            category,
            teacher_id: user.id,
            is_system: false,
          });

        if (error) throw error;
        toast.success('模板已创建');
      }

      setDialogOpen(false);
      setEditingTemplate(null);
      setContent('');
      setCategory('excellent');
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('comment_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('模板已删除');
      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.message || '删除失败');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const openEditDialog = (template: CommentTemplate) => {
    setEditingTemplate(template);
    setContent(template.content);
    setCategory(template.category);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setContent('');
    setCategory('excellent');
    setDialogOpen(true);
  };

  const getCategoryInfo = (cat: string) => {
    return CATEGORIES.find(c => c.value === cat) || { label: cat, color: 'bg-secondary' };
  };

  const groupedTemplates = CATEGORIES.map(cat => ({
    ...cat,
    templates: templates.filter(t => t.category === cat.value),
  }));

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
            <BookOpen className="h-6 w-6 text-primary" />
            评语模板
          </h1>
          <p className="text-muted-foreground mt-1">
            管理常用评语，提高评价效率
          </p>
        </div>
        
        <Button onClick={openCreateDialog} className="gradient-primary text-white">
          <Plus className="h-4 w-4 mr-2" />
          新建模板
        </Button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {CATEGORIES.map((cat) => {
          const count = templates.filter(t => t.category === cat.value).length;
          return (
            <Card key={cat.value}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{cat.label}</span>
                  <Badge className={cat.color}>{count}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 模板列表 */}
      <div className="space-y-6">
        {groupedTemplates.map((group) => (
          group.templates.length > 0 && (
            <Card key={group.value}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className={group.color}>{group.label}</Badge>
                  <span className="text-muted-foreground font-normal text-sm">
                    {group.templates.length} 个模板
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {group.templates.map((template) => (
                    <div 
                      key={template.id}
                      className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/30 transition-all group"
                    >
                      <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{template.content}</p>
                        {template.is_system && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            系统模板
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopy(template.content)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!template.is_system && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除这个评语模板吗？此操作无法撤销。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(template.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无评语模板</p>
              <p className="text-sm mt-1">点击"新建模板"创建您的第一个评语模板</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 新建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '编辑模板' : '新建模板'}</DialogTitle>
            <DialogDescription>
              创建常用评语模板，评价时快速选用
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>分类</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={cat.color}>{cat.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>评语内容</Label>
              <Textarea
                placeholder="请输入评语内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                建议评语简洁明了，便于快速选用
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSave}
              disabled={submitting || !content.trim()}
              className="gradient-primary text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? '保存修改' : '创建模板'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
