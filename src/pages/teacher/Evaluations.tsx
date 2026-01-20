import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FilePreview } from '@/components/FilePreview';
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
  Star, 
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  Filter,
  Eye,
  Send,
  Users,
  FileText,
  Paperclip,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Submission {
  id: string;
  content: string | null;
  file_urls: string[] | null;
  status: string;
  submitted_at: string;
  user_id: string;
  profile?: {
    full_name: string;
    student_id: string | null;
  };
  task: {
    id: string;
    name: string;
    task_number: string;
    course: {
      id: string;
      name: string;
    };
  };
}

interface CommentTemplate {
  id: string;
  content: string;
  category: string;
}

interface Course {
  id: string;
  name: string;
}

interface TrainingTask {
  id: string;
  name: string;
  task_number: string;
  course_id: string;
}

export default function TeacherEvaluations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [templates, setTemplates] = useState<CommentTemplate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 单个评价状态
  const [evaluatingSubmission, setEvaluatingSubmission] = useState<Submission | null>(null);
  const [score, setScore] = useState<number>(80);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 批量评价状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchScore, setBatchScore] = useState<number>(80);
  const [batchComment, setBatchComment] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user?.id) return;
    
    try {
      // 首先获取教师负责的课程
      const { data: teacherCoursesData } = await supabase
        .from('teacher_courses')
        .select('course_id')
        .eq('user_id', user.id);
      
      const teacherCourseIds = teacherCoursesData?.map(tc => tc.course_id) || [];
      
      // 如果教师没有分配课程，显示空列表
      if (teacherCourseIds.length === 0) {
        setCourses([]);
        setTasks([]);
        setSubmissions([]);
        setLoading(false);
        return;
      }

      // 先获取教师负责课程的任务ID
      const { data: tasksData } = await supabase
        .from('training_tasks')
        .select('id, name, task_number, course_id')
        .in('course_id', teacherCourseIds)
        .order('scheduled_date', { ascending: false });
      
      const taskIds = tasksData?.map(t => t.id) || [];
      setTasks(tasksData || []);

      // 获取课程信息
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, name')
        .in('id', teacherCourseIds)
        .order('name');
      
      setCourses(coursesData || []);

      // 如果没有任务，不需要查询提交
      if (taskIds.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      // 获取这些任务的提交
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          id,
          content,
          file_urls,
          status,
          submitted_at,
          user_id,
          task_id
        `)
        .in('task_id', taskIds)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // 构建任务映射
      const tasksMap: Record<string, TrainingTask & { course?: Course }> = {};
      tasksData?.forEach(t => {
        tasksMap[t.id] = t;
      });

      // 获取课程映射
      const coursesMap: Record<string, Course> = {};
      coursesData?.forEach(c => {
        coursesMap[c.id] = c;
      });

      // 获取用户资料
      const userIds = [...new Set(submissionsData?.map(s => s.user_id) || [])] as string[];
      let profilesMap: Record<string, { full_name: string; student_id: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, student_id')
          .in('user_id', userIds);
        
        profilesData?.forEach(p => {
          profilesMap[p.user_id] = { full_name: p.full_name, student_id: p.student_id };
        });
      }

      // 构建带完整信息的提交列表
      const submissionsWithProfiles = (submissionsData || []).map(s => {
        const task = tasksMap[s.task_id];
        const course = task ? coursesMap[task.course_id] : null;
        return {
          ...s,
          profile: profilesMap[s.user_id],
          task: task ? {
            id: task.id,
            name: task.name,
            task_number: task.task_number,
            course: course ? { id: course.id, name: course.name } : { id: '', name: '' }
          } : null
        };
      }).filter(s => s.task !== null) as Submission[];

      setSubmissions(submissionsWithProfiles);

      // 获取评语模板
      const { data: templatesData } = await supabase
        .from('comment_templates')
        .select('id, content, category')
        .or(`is_system.eq.true,teacher_id.eq.${user?.id}`);
      
      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!evaluatingSubmission || !user?.id) return;

    setSubmitting(true);
    try {
      // 创建评价
      const { error: evalError } = await supabase
        .from('evaluations')
        .insert({
          submission_id: evaluatingSubmission.id,
          teacher_id: user.id,
          score,
          comment: comment || null,
        });

      if (evalError) throw evalError;

      // 更新提交状态
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ status: 'evaluated' })
        .eq('id', evaluatingSubmission.id);

      if (updateError) throw updateError;

      toast.success('评价成功！');
      setEvaluatingSubmission(null);
      setScore(80);
      setComment('');
      fetchData();
    } catch (error: any) {
      console.error('Error evaluating:', error);
      toast.error(error.message || '评价失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchEvaluate = async () => {
    if (selectedIds.size === 0 || !user?.id) return;

    setSubmitting(true);
    try {
      const evaluations = Array.from(selectedIds).map(submissionId => ({
        submission_id: submissionId,
        teacher_id: user.id,
        score: batchScore,
        comment: batchComment || null,
      }));

      const { error: evalError } = await supabase
        .from('evaluations')
        .insert(evaluations);

      if (evalError) throw evalError;

      // 批量更新状态
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ status: 'evaluated' })
        .in('id', Array.from(selectedIds));

      if (updateError) throw updateError;

      toast.success(`成功评价 ${selectedIds.size} 份成果！`);
      setBatchDialogOpen(false);
      setSelectedIds(new Set());
      setBatchScore(80);
      setBatchComment('');
      fetchData();
    } catch (error: any) {
      console.error('Error batch evaluating:', error);
      toast.error(error.message || '批量评价失败');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    const pendingSubmissions = filteredSubmissions.filter(s => s.status === 'pending');
    if (selectedIds.size === pendingSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingSubmissions.map(s => s.id)));
    }
  };

  const useTemplate = (content: string, isBatch: boolean = false) => {
    if (isBatch) {
      setBatchComment(prev => prev ? `${prev}\n${content}` : content);
    } else {
      setComment(prev => prev ? `${prev}\n${content}` : content);
    }
  };

  // 根据选择的课程筛选可用任务
  const filteredTasks = selectedCourse === 'all' 
    ? tasks 
    : tasks.filter(t => t.course_id === selectedCourse);

  const filteredSubmissions = submissions.filter(s => {
    const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
    const matchesCourse = selectedCourse === 'all' || s.task?.course?.id === selectedCourse;
    const matchesTask = selectedTask === 'all' || s.task?.id === selectedTask;
    const matchesSearch = !searchTerm ||
      s.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.task?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCourse && matchesTask && matchesSearch;
  });

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const evaluatedCount = submissions.filter(s => s.status === 'evaluated').length;

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
            <Star className="h-6 w-6 text-primary" />
            成果评价
          </h1>
          <p className="text-muted-foreground mt-1">
            评价学生提交的实训成果
          </p>
        </div>
        
        {selectedIds.size > 0 && (
          <Button 
            onClick={() => setBatchDialogOpen(true)}
            className="gradient-primary text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            批量评价 ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-6 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">总提交</p>
                <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{submissions.length}</p>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-lg bg-primary/10 items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-3 sm:pt-6 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">待评价</p>
                <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1 text-warning">{pendingCount}</p>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-lg bg-warning/10 items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:pt-6 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">已评价</p>
                <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1 text-success">{evaluatedCount}</p>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-lg bg-success/10 items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选条件 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索学生姓名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCourse} onValueChange={(value) => {
              setSelectedCourse(value);
              setSelectedTask('all'); // 切换课程时重置任务选择
            }}>
              <SelectTrigger>
                <SelectValue placeholder="选择课程" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部课程</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger>
                <SelectValue placeholder="选择任务" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部任务</SelectItem>
                {filteredTasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.task_number} - {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待评价</SelectItem>
                <SelectItem value="evaluated">已评价</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 提交列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">提交列表</CardTitle>
              <CardDescription>共 {filteredSubmissions.length} 条记录</CardDescription>
            </div>
            {filteredSubmissions.filter(s => s.status === 'pending').length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedIds.size === filteredSubmissions.filter(s => s.status === 'pending').length
                  ? '取消全选'
                  : '全选待评价'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无提交记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <div 
                  key={submission.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all ${
                    selectedIds.has(submission.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {submission.status === 'pending' && (
                      <Checkbox
                        checked={selectedIds.has(submission.id)}
                        onCheckedChange={() => toggleSelect(submission.id)}
                        className="shrink-0"
                      />
                    )}
                    
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {submission.profile?.full_name?.slice(0, 1) || '?'}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{submission.profile?.full_name || '未知用户'}</p>
                        <Badge variant={submission.status === 'pending' ? 'outline' : 'secondary'} className="shrink-0">
                          {submission.status === 'pending' ? '待评价' : '已评价'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {submission.task?.course?.name} · {submission.task?.name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1 hidden sm:block">
                        {submission.content}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pl-6 sm:pl-0">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(parseISO(submission.submitted_at), 'MM/dd HH:mm')}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setEvaluatingSubmission(submission);
                        setScore(80);
                        setComment('');
                      }}
                    >
                      <Eye className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">{submission.status === 'pending' ? '评价' : '查看'}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 单个评价弹窗 */}
      <Dialog open={!!evaluatingSubmission} onOpenChange={() => setEvaluatingSubmission(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>评价学生成果</DialogTitle>
            <DialogDescription>
              {evaluatingSubmission?.profile?.full_name} - {evaluatingSubmission?.task?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* 成果内容 */}
            {evaluatingSubmission?.content && (
              <div>
                <Label className="text-muted-foreground">提交内容</Label>
                <div className="mt-2 p-4 rounded-lg bg-secondary/50 max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                  {evaluatingSubmission.content}
                </div>
              </div>
            )}

            {evaluatingSubmission?.file_urls && evaluatingSubmission.file_urls.length > 0 && (
              <div>
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  附件文件 ({evaluatingSubmission.file_urls.length})
                </Label>
                <div className="mt-2 p-4 rounded-lg bg-secondary/50">
                  <FilePreview urls={evaluatingSubmission.file_urls} />
                </div>
              </div>
            )}

            {evaluatingSubmission?.status === 'pending' && (
              <>
                {/* 评分 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>评分</Label>
                    <span className="text-3xl font-bold text-primary">{score}</span>
                  </div>
                  <Slider
                    value={[score]}
                    onValueChange={(v) => setScore(v[0])}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>60</span>
                    <span>80</span>
                    <span>100</span>
                  </div>
                </div>

                {/* 评语 */}
                <div className="space-y-2">
                  <Label>评语</Label>
                  <Textarea
                    placeholder="请输入评语..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* 评语模板 */}
                {templates.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">快速选择评语</Label>
                    <div className="flex flex-wrap gap-2">
                      {templates.slice(0, 6).map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          size="sm"
                          onClick={() => useTemplate(template.content)}
                          className="text-xs"
                        >
                          {template.content.slice(0, 15)}...
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvaluatingSubmission(null)}>
              取消
            </Button>
            {evaluatingSubmission?.status === 'pending' && (
              <Button 
                onClick={handleEvaluate}
                disabled={submitting}
                className="gradient-primary text-white"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                提交评价
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量评价弹窗 */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>批量评价</DialogTitle>
            <DialogDescription>
              为选中的 {selectedIds.size} 份成果统一打分
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* 评分 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>统一评分</Label>
                <span className="text-3xl font-bold text-primary">{batchScore}</span>
              </div>
              <Slider
                value={[batchScore]}
                onValueChange={(v) => setBatchScore(v[0])}
                min={0}
                max={100}
                step={1}
              />
            </div>

            {/* 评语 */}
            <div className="space-y-2">
              <Label>统一评语（可选）</Label>
              <Textarea
                placeholder="请输入评语..."
                value={batchComment}
                onChange={(e) => setBatchComment(e.target.value)}
                rows={4}
              />
            </div>

            {/* 评语模板 */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">快速选择</Label>
                <div className="flex flex-wrap gap-2">
                  {templates.slice(0, 4).map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => useTemplate(template.content, true)}
                      className="text-xs"
                    >
                      {template.content.slice(0, 12)}...
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleBatchEvaluate}
              disabled={submitting}
              className="gradient-primary text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认批量评价
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
