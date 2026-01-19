import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileUpload } from '@/components/FileUpload';
import { FilePreview } from '@/components/FilePreview';
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
  Upload, 
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Loader2,
  Eye,
  Calendar,
  Paperclip,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TrainingTask {
  id: string;
  name: string;
  task_number: string;
  scheduled_date: string;
  course: {
    name: string;
  };
}

interface Submission {
  id: string;
  content: string | null;
  file_urls: string[] | null;
  status: string;
  submitted_at: string;
  task: {
    id: string;
    name: string;
    task_number: string;
    course: {
      name: string;
    };
  };
  evaluation?: {
    score: number;
    comment: string | null;
  };
}

export default function Submissions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [content, setContent] = useState('');
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    
    try {
      // 获取学生分配的课程
      const { data: studentCoursesData } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('user_id', user.id);
      
      const courseIds = studentCoursesData?.map(sc => sc.course_id) || [];

      // 获取可提交的任务（今天及之前的，且属于学生分配的课程）
      const today = format(new Date(), 'yyyy-MM-dd');
      let tasksQuery = supabase
        .from('training_tasks')
        .select(`
          id,
          name,
          task_number,
          scheduled_date,
          course:courses(name)
        `)
        .lte('scheduled_date', today)
        .order('scheduled_date', { ascending: false })
        .limit(20);
      
      // 如果有课程限制，应用过滤
      if (courseIds.length > 0) {
        tasksQuery = tasksQuery.in('course_id', courseIds);
      } else {
        // 如果没有分配课程，返回空
        setTasks([]);
      }

      const { data: tasksData, error: tasksError } = await tasksQuery;

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // 获取已提交的成果
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          id,
          content,
          file_urls,
          status,
          submitted_at,
          task:training_tasks(
            id,
            name,
            task_number,
            course:courses(name)
          )
        `)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;
      
      // 获取评价信息
      const submissionIds = submissionsData?.map(s => s.id) || [];
      let evaluationsMap: Record<string, { score: number; comment: string | null }> = {};
      
      if (submissionIds.length > 0) {
        const { data: evaluationsData } = await supabase
          .from('evaluations')
          .select('submission_id, score, comment')
          .in('submission_id', submissionIds);
        
        evaluationsData?.forEach(e => {
          evaluationsMap[e.submission_id] = { score: e.score, comment: e.comment };
        });
      }

      const submissionsWithEval = (submissionsData || []).map(s => ({
        ...s,
        evaluation: evaluationsMap[s.id],
      })) as unknown as Submission[];
      
      setSubmissions(submissionsWithEval);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !selectedTask) {
      toast.error('请选择任务');
      return;
    }

    if (!content.trim() && fileUrls.length === 0) {
      toast.error('请填写成果内容或上传文件');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          task_id: selectedTask,
          content: content.trim() || null,
          file_urls: fileUrls.length > 0 ? fileUrls : null,
          status: 'pending',
        });

      if (error) throw error;
      
      toast.success('成果提交成功！');
      setDialogOpen(false);
      setSelectedTask('');
      setContent('');
      setFileUrls([]);
      fetchData();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">待评价</Badge>;
      case 'evaluated':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">已评价</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">需修改</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-warning" />;
      case 'evaluated':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  // 过滤掉已提交的任务
  const submittedTaskIds = new Set(submissions.map(s => s.task?.id));
  const availableTasks = tasks.filter(t => !submittedTaskIds.has(t.id));

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
            <Upload className="h-6 w-6 text-primary" />
            成果提交
          </h1>
          <p className="text-muted-foreground mt-1">
            提交实训任务完成成果，等待老师评价
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              提交新成果
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>提交实训成果</DialogTitle>
              <DialogDescription>
                选择任务并描述您的实训完成情况
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="task">选择任务 *</Label>
                <Select value={selectedTask} onValueChange={setSelectedTask}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择要提交成果的任务" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTasks.length === 0 ? (
                      <SelectItem value="none" disabled>
                        暂无可提交的任务
                      </SelectItem>
                    ) : (
                      availableTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          <div className="flex flex-col">
                            <span>{task.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {task.course?.name} · {task.task_number}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">成果描述</Label>
                <Textarea
                  id="content"
                  placeholder="请描述您完成本次实训任务的过程和成果..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  详细描述您的实训过程、遇到的问题及解决方法
                </p>
              </div>

              {/* 文件上传 */}
              {user?.id && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    上传附件
                  </Label>
                  <FileUpload
                    userId={user.id}
                    onFilesChange={setFileUrls}
                    existingFiles={fileUrls}
                    maxFiles={5}
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setDialogOpen(false);
                setFileUrls([]);
              }}>
                取消
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={submitting || !selectedTask || (!content.trim() && fileUrls.length === 0)}
                className="gradient-primary text-white"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                提交成果
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总提交</p>
                <p className="text-2xl font-bold mt-1">{submissions.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待评价</p>
                <p className="text-2xl font-bold mt-1">
                  {submissions.filter(s => s.status === 'pending').length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已评价</p>
                <p className="text-2xl font-bold mt-1">
                  {submissions.filter(s => s.status === 'evaluated').length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 提交列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">我的提交记录</CardTitle>
          <CardDescription>
            查看所有已提交的实训成果
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无提交记录</p>
              <p className="text-sm mt-1">点击"提交新成果"开始提交</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div 
                  key={submission.id}
                  className="p-4 rounded-xl border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-secondary">
                        {getStatusIcon(submission.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{submission.task?.name}</h3>
                          {getStatusBadge(submission.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {submission.task?.course?.name} · {submission.task?.task_number}
                        </p>
                        {submission.content && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {submission.content}
                          </p>
                        )}
                        {submission.file_urls && submission.file_urls.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                            <Paperclip className="h-4 w-4" />
                            <span>{submission.file_urls.length} 个附件</span>
                          </div>
                        )}
                        {submission.evaluation && (
                          <div className="mt-2 p-2 rounded-lg bg-success/5 border border-success/20">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">评分：</span>
                              <span className="text-lg font-bold text-success">
                                {submission.evaluation.score}
                              </span>
                              <span className="text-sm text-muted-foreground">分</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(parseISO(submission.submitted_at), 'MM/dd HH:mm')}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingSubmission(submission)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        详情
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={!!viewingSubmission} onOpenChange={() => setViewingSubmission(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{viewingSubmission?.task?.name}</DialogTitle>
            <DialogDescription>
              {viewingSubmission?.task?.course?.name} · {viewingSubmission?.task?.task_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {viewingSubmission?.content && (
              <div>
                <Label className="text-muted-foreground">提交内容</Label>
                <div className="mt-2 p-3 rounded-lg bg-secondary/50 whitespace-pre-wrap">
                  {viewingSubmission.content}
                </div>
              </div>
            )}

            {viewingSubmission?.file_urls && viewingSubmission.file_urls.length > 0 && (
              <div>
                <Label className="text-muted-foreground">附件文件</Label>
                <div className="mt-2 p-3 rounded-lg bg-secondary/50">
                  <FilePreview urls={viewingSubmission.file_urls} />
                </div>
              </div>
            )}
            
            <div>
              <Label className="text-muted-foreground">提交时间</Label>
              <p className="mt-1">
                {viewingSubmission && format(
                  parseISO(viewingSubmission.submitted_at), 
                  'yyyy年MM月dd日 HH:mm',
                  { locale: zhCN }
                )}
              </p>
            </div>
            
            <div>
              <Label className="text-muted-foreground">状态</Label>
              <div className="mt-2">
                {viewingSubmission && getStatusBadge(viewingSubmission.status)}
              </div>
            </div>
            
            {viewingSubmission?.evaluation && (
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <Label className="text-success">教师评价</Label>
                <div className="mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-success">
                      {viewingSubmission.evaluation.score}
                    </span>
                    <span className="text-muted-foreground">分</span>
                  </div>
                  {viewingSubmission.evaluation.comment && (
                    <p className="mt-2 text-sm">{viewingSubmission.evaluation.comment}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
