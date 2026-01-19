import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  BookOpen, 
  Plus,
  Loader2,
  Edit,
  Trash2,
  ChevronRight,
  GraduationCap,
  ClipboardList,
  Calendar,
  UserCog,
  Users,
  Link,
  Unlink,
} from 'lucide-react';
import { format } from 'date-fns';

interface Major {
  id: string;
  name: string;
  description: string | null;
  courses: Course[];
}

interface Course {
  id: string;
  name: string;
  description: string | null;
  major_id: string;
  tasks: Task[];
}

interface Task {
  id: string;
  name: string;
  task_number: string;
  description: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
}

interface Teacher {
  id: string;
  full_name: string;
  employee_id: string | null;
  assignedCourseIds: string[];
}

interface Student {
  id: string;
  full_name: string;
  student_id: string | null;
  assignedCourseIds: string[];
}

export default function CourseManagement() {
  const [loading, setLoading] = useState(true);
  const [majors, setMajors] = useState<Major[]>([]);
  const [activeTab, setActiveTab] = useState('courses');
  
  // Teachers and Students
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allCourses, setAllCourses] = useState<{ id: string; name: string; majorName: string }[]>([]);
  
  // Dialog states
  const [majorDialogOpen, setMajorDialogOpen] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [teacherAssignDialogOpen, setTeacherAssignDialogOpen] = useState(false);
  const [studentAssignDialogOpen, setStudentAssignDialogOpen] = useState(false);
  
  // Edit states
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedMajorId, setSelectedMajorId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedMajorIds, setSelectedMajorIds] = useState<string[]>([]);
  
  // Form states
  const [majorForm, setMajorForm] = useState({ name: '', description: '' });
  const [courseForm, setCourseForm] = useState({ name: '', description: '', major_id: '' });
  const [taskForm, setTaskForm] = useState({
    name: '',
    task_number: '',
    description: '',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '08:30',
    end_time: '11:30',
    course_id: '',
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 获取专业
      const { data: majorsData, error: majorsError } = await supabase
        .from('majors')
        .select('*')
        .order('name');

      if (majorsError) throw majorsError;

      // 获取课程
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('name');

      if (coursesError) throw coursesError;

      // 获取任务
      const { data: tasksData, error: tasksError } = await supabase
        .from('training_tasks')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (tasksError) throw tasksError;

      // 组装数据
      const majorsWithCourses: Major[] = (majorsData || []).map(major => ({
        ...major,
        courses: (coursesData || [])
          .filter(course => course.major_id === major.id)
          .map(course => ({
            ...course,
            tasks: (tasksData || []).filter(task => task.course_id === course.id),
          })),
      }));

      setMajors(majorsWithCourses);
      
      // 构建课程列表（带专业名称）
      const coursesWithMajor = (coursesData || []).map(course => {
        const major = majorsData?.find(m => m.id === course.major_id);
        return {
          id: course.id,
          name: course.name,
          majorName: major?.name || '未分类',
        };
      });
      setAllCourses(coursesWithMajor);
      
      // 获取教师和学生
      await fetchTeachersAndStudents();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachersAndStudents = async () => {
    try {
      // 获取教师角色的用户
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
      
      const teacherIds = teacherRoles?.map(r => r.user_id) || [];
      
      // 获取学生角色的用户
      const { data: studentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');
      
      const studentIds = studentRoles?.map(r => r.user_id) || [];
      
      // 获取教师资料
      if (teacherIds.length > 0) {
        const { data: teacherProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, employee_id')
          .in('user_id', teacherIds);
        
        // 获取教师-课程关联
        const { data: teacherCourses } = await supabase
          .from('teacher_courses')
          .select('user_id, course_id')
          .in('user_id', teacherIds);
        
        const teacherData: Teacher[] = (teacherProfiles || []).map(p => ({
          id: p.user_id,
          full_name: p.full_name,
          employee_id: p.employee_id,
          assignedCourseIds: (teacherCourses || [])
            .filter(tc => tc.user_id === p.user_id)
            .map(tc => tc.course_id),
        }));
        
        setTeachers(teacherData);
      }
      
      // 获取学生资料
      if (studentIds.length > 0) {
        const { data: studentProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, student_id')
          .in('user_id', studentIds);
        
        // 获取学生-课程关联
        const { data: studentCourses } = await supabase
          .from('student_courses')
          .select('user_id, course_id')
          .in('user_id', studentIds);
        
        const studentData: Student[] = (studentProfiles || []).map(p => ({
          id: p.user_id,
          full_name: p.full_name,
          student_id: p.student_id,
          assignedCourseIds: (studentCourses || [])
            .filter(sc => sc.user_id === p.user_id)
            .map(sc => sc.course_id),
        }));
        
        setStudents(studentData);
      }
    } catch (error) {
      console.error('Error fetching teachers and students:', error);
    }
  };

  // Major handlers
  const openMajorDialog = (major?: Major) => {
    if (major) {
      setEditingMajor(major);
      setMajorForm({ name: major.name, description: major.description || '' });
    } else {
      setEditingMajor(null);
      setMajorForm({ name: '', description: '' });
    }
    setMajorDialogOpen(true);
  };

  const saveMajor = async () => {
    if (!majorForm.name.trim()) {
      toast.error('请输入专业名称');
      return;
    }

    setSaving(true);
    try {
      if (editingMajor) {
        const { error } = await supabase
          .from('majors')
          .update({ name: majorForm.name, description: majorForm.description || null })
          .eq('id', editingMajor.id);
        if (error) throw error;
        toast.success('专业已更新');
      } else {
        const { error } = await supabase
          .from('majors')
          .insert({ name: majorForm.name, description: majorForm.description || null });
        if (error) throw error;
        toast.success('专业已创建');
      }
      setMajorDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const deleteMajor = async (id: string) => {
    try {
      const { error } = await supabase.from('majors').delete().eq('id', id);
      if (error) throw error;
      toast.success('专业已删除');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  // Course handlers
  const openCourseDialog = (majorId: string, course?: Course) => {
    setSelectedMajorId(majorId);
    if (course) {
      setEditingCourse(course);
      setCourseForm({ name: course.name, description: course.description || '', major_id: course.major_id });
    } else {
      setEditingCourse(null);
      setCourseForm({ name: '', description: '', major_id: majorId });
    }
    setCourseDialogOpen(true);
  };

  const saveCourse = async () => {
    if (!courseForm.name.trim()) {
      toast.error('请输入课程名称');
      return;
    }

    setSaving(true);
    try {
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update({ name: courseForm.name, description: courseForm.description || null })
          .eq('id', editingCourse.id);
        if (error) throw error;
        toast.success('课程已更新');
      } else {
        const { error } = await supabase
          .from('courses')
          .insert({ 
            name: courseForm.name, 
            description: courseForm.description || null,
            major_id: courseForm.major_id,
          });
        if (error) throw error;
        toast.success('课程已创建');
      }
      setCourseDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
      toast.success('课程已删除');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  // Task handlers
  const openTaskDialog = (courseId: string, task?: Task) => {
    setSelectedCourseId(courseId);
    if (task) {
      setEditingTask(task);
      setTaskForm({
        name: task.name,
        task_number: task.task_number,
        description: task.description || '',
        scheduled_date: task.scheduled_date,
        start_time: task.start_time || '08:30',
        end_time: task.end_time || '11:30',
        course_id: courseId,
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        name: '',
        task_number: '',
        description: '',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '08:30',
        end_time: '11:30',
        course_id: courseId,
      });
    }
    setTaskDialogOpen(true);
  };

  const saveTask = async () => {
    if (!taskForm.name.trim() || !taskForm.task_number.trim()) {
      toast.error('请填写任务名称和编号');
      return;
    }

    setSaving(true);
    try {
      const taskData = {
        name: taskForm.name,
        task_number: taskForm.task_number,
        description: taskForm.description || null,
        scheduled_date: taskForm.scheduled_date,
        start_time: taskForm.start_time,
        end_time: taskForm.end_time,
        course_id: taskForm.course_id,
      };

      if (editingTask) {
        const { error } = await supabase
          .from('training_tasks')
          .update(taskData)
          .eq('id', editingTask.id);
        if (error) throw error;
        toast.success('任务已更新');
      } else {
        const { error } = await supabase
          .from('training_tasks')
          .insert(taskData);
        if (error) throw error;
        toast.success('任务已创建');
      }
      setTaskDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('training_tasks').delete().eq('id', id);
      if (error) throw error;
      toast.success('任务已删除');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  // Teacher assignment handlers
  const openTeacherAssignDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setSelectedCourseIds(teacher.assignedCourseIds);
    setTeacherAssignDialogOpen(true);
  };

  const saveTeacherAssignment = async () => {
    if (!selectedTeacher) return;
    
    setSaving(true);
    try {
      // 删除旧的分配
      await supabase
        .from('teacher_courses')
        .delete()
        .eq('user_id', selectedTeacher.id);
      
      // 插入新的分配
      if (selectedCourseIds.length > 0) {
        const { error } = await supabase
          .from('teacher_courses')
          .insert(
            selectedCourseIds.map(courseId => ({
              user_id: selectedTeacher.id,
              course_id: courseId,
            }))
          );
        if (error) throw error;
      }
      
      toast.success('课程分配已更新');
      setTeacherAssignDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Student assignment handlers
  const openStudentAssignDialog = (student: Student) => {
    setSelectedStudent(student);
    setSelectedCourseIds(student.assignedCourseIds);
    setStudentAssignDialogOpen(true);
  };

  const saveStudentAssignment = async () => {
    if (!selectedStudent) return;
    
    setSaving(true);
    try {
      // 删除旧的分配
      await supabase
        .from('student_courses')
        .delete()
        .eq('user_id', selectedStudent.id);
      
      // 插入新的分配
      if (selectedCourseIds.length > 0) {
        const { error } = await supabase
          .from('student_courses')
          .insert(
            selectedCourseIds.map(courseId => ({
              user_id: selectedStudent.id,
              course_id: courseId,
            }))
          );
        if (error) throw error;
      }
      
      toast.success('课程分配已更新');
      setStudentAssignDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const toggleMajorSelection = (majorId: string) => {
    setSelectedMajorIds(prev => 
      prev.includes(majorId) 
        ? prev.filter(id => id !== majorId)
        : [...prev, majorId]
    );
  };

  const totalCourses = majors.reduce((acc, m) => acc + m.courses.length, 0);
  const totalTasks = majors.reduce((acc, m) => acc + m.courses.reduce((a, c) => a + c.tasks.length, 0), 0);

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
            课程管理
          </h1>
          <p className="text-muted-foreground mt-1">
            管理专业、课程、任务及人员分配
          </p>
        </div>
      </div>

      {/* Tab 切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            课程任务
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            教师分配
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            学生分配
          </TabsTrigger>
        </TabsList>

        {/* 课程任务 Tab */}
        <TabsContent value="courses" className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">专业数</p>
                    <p className="text-2xl font-bold mt-1">{majors.length}</p>
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
                    <p className="text-sm text-muted-foreground">课程数</p>
                    <p className="text-2xl font-bold mt-1">{totalCourses}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">任务数</p>
                    <p className="text-2xl font-bold mt-1">{totalTasks}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 新建专业按钮 */}
          <div className="flex justify-end">
            <Button onClick={() => openMajorDialog()} className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              新建专业
            </Button>
          </div>

          {/* 专业列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">专业与课程</CardTitle>
              <CardDescription>点击展开查看课程和任务</CardDescription>
            </CardHeader>
            <CardContent>
              {majors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>暂无专业数据</p>
                  <p className="text-sm mt-1">点击"新建专业"开始创建</p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-4">
                  {majors.map((major) => (
                    <AccordionItem key={major.id} value={major.id} className="border rounded-xl px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{major.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {major.courses.length} 门课程
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-4">
                        {/* Major actions */}
                        <div className="flex gap-2 pb-4 border-b">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openMajorDialog(major)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            编辑专业
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openCourseDialog(major.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            添加课程
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-1" />
                                删除
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                <AlertDialogDescription>
                                  删除专业将同时删除其下所有课程和任务，此操作无法撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMajor(major.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        {/* Courses */}
                        {major.courses.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4">暂无课程</p>
                        ) : (
                          <div className="space-y-3">
                            {major.courses.map((course) => (
                              <div key={course.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-success" />
                                    <span className="font-medium">{course.name}</span>
                                    <Badge variant="outline">{course.tasks.length} 个任务</Badge>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openCourseDialog(major.id, course)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openTaskDialog(course.id)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-8 w-8 text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            删除课程将同时删除其下所有任务。
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>取消</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteCourse(course.id)}
                                            className="bg-destructive text-destructive-foreground"
                                          >
                                            删除
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>

                                {/* Tasks */}
                                {course.tasks.length > 0 && (
                                  <div className="space-y-2 pl-6">
                                    {course.tasks.map((task) => (
                                      <div 
                                        key={task.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-sm"
                                      >
                                        <div className="flex items-center gap-2">
                                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                          <span>{task.name}</span>
                                          <Badge variant="secondary" className="text-xs">
                                            {task.task_number}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground text-xs flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {task.scheduled_date}
                                          </span>
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => openTaskDialog(course.id, task)}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button 
                                                variant="ghost" 
                                                size="icon"
                                                className="h-6 w-6 text-destructive"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  确定要删除此任务吗？
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => deleteTask(task.id)}
                                                  className="bg-destructive text-destructive-foreground"
                                                >
                                                  删除
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 教师分配 Tab */}
        <TabsContent value="teachers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" />
                教师课程分配
              </CardTitle>
              <CardDescription>
                为教师分配可评价的课程，教师只能查看和评价已分配课程的学生成果
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teachers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCog className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>暂无教师数据</p>
                  <p className="text-sm mt-1">请先在用户管理中添加教师</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teachers.map((teacher) => (
                    <div 
                      key={teacher.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 transition-all"
                    >
                      <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                        <span className="text-lg font-medium text-success">
                          {teacher.full_name?.slice(0, 1) || '?'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{teacher.full_name}</p>
                          {teacher.employee_id && (
                            <Badge variant="outline">工号: {teacher.employee_id}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {teacher.assignedCourseIds.length === 0 ? (
                            <span className="text-sm text-muted-foreground">未分配课程</span>
                          ) : (
                            <>
                              <Badge className="bg-primary/10 text-primary">
                                {teacher.assignedCourseIds.length} 门课程
                              </Badge>
                              {teacher.assignedCourseIds.slice(0, 3).map(courseId => {
                                const course = allCourses.find(c => c.id === courseId);
                                return course ? (
                                  <Badge key={courseId} variant="secondary" className="text-xs">
                                    {course.name}
                                  </Badge>
                                ) : null;
                              })}
                              {teacher.assignedCourseIds.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{teacher.assignedCourseIds.length - 3} 更多
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline"
                        onClick={() => openTeacherAssignDialog(teacher)}
                      >
                        <Link className="h-4 w-4 mr-2" />
                        分配课程
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 学生分配 Tab */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                学生课程分配
              </CardTitle>
              <CardDescription>
                为学生分配课程，学生只能看到所分配课程下的实训任务
              </CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>暂无学生数据</p>
                  <p className="text-sm mt-1">请先在用户管理中添加学生</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((student) => (
                    <div 
                      key={student.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 transition-all"
                    >
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-lg font-medium text-primary">
                          {student.full_name?.slice(0, 1) || '?'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{student.full_name}</p>
                          {student.student_id && (
                            <Badge variant="outline">学号: {student.student_id}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {student.assignedCourseIds.length === 0 ? (
                            <span className="text-sm text-muted-foreground">未分配课程</span>
                          ) : (
                            <>
                              {student.assignedCourseIds.map(courseId => {
                                const course = allCourses.find(c => c.id === courseId);
                                return course ? (
                                  <Badge key={courseId} className="bg-primary/10 text-primary">
                                    {course.name}
                                  </Badge>
                                ) : null;
                              })}
                            </>
                          )}
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline"
                        onClick={() => openStudentAssignDialog(student)}
                      >
                        <Link className="h-4 w-4 mr-2" />
                        分配课程
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Major Dialog */}
      <Dialog open={majorDialogOpen} onOpenChange={setMajorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMajor ? '编辑专业' : '新建专业'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>专业名称 *</Label>
              <Input
                value={majorForm.name}
                onChange={(e) => setMajorForm({ ...majorForm, name: e.target.value })}
                placeholder="如：电气工程"
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={majorForm.description}
                onChange={(e) => setMajorForm({ ...majorForm, description: e.target.value })}
                placeholder="专业描述（选填）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMajorDialogOpen(false)}>取消</Button>
            <Button onClick={saveMajor} disabled={saving} className="gradient-primary text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourse ? '编辑课程' : '新建课程'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>课程名称 *</Label>
              <Input
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                placeholder="如：电工基础实训"
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                placeholder="课程描述（选填）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseDialogOpen(false)}>取消</Button>
            <Button onClick={saveCourse} disabled={saving} className="gradient-primary text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? '编辑任务' : '新建任务'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>任务名称 *</Label>
                <Input
                  value={taskForm.name}
                  onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                  placeholder="如：接线练习"
                />
              </div>
              <div className="space-y-2">
                <Label>任务编号 *</Label>
                <Input
                  value={taskForm.task_number}
                  onChange={(e) => setTaskForm({ ...taskForm, task_number: e.target.value })}
                  placeholder="如：EL-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>任务描述</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="任务描述（选填）"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>计划日期 *</Label>
              <Input
                type="date"
                value={taskForm.scheduled_date}
                onChange={(e) => setTaskForm({ ...taskForm, scheduled_date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始时间</Label>
                <Input
                  type="time"
                  value={taskForm.start_time}
                  onChange={(e) => setTaskForm({ ...taskForm, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>结束时间</Label>
                <Input
                  type="time"
                  value={taskForm.end_time}
                  onChange={(e) => setTaskForm({ ...taskForm, end_time: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>取消</Button>
            <Button onClick={saveTask} disabled={saving} className="gradient-primary text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Assignment Dialog */}
      <Dialog open={teacherAssignDialogOpen} onOpenChange={setTeacherAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>分配课程给 {selectedTeacher?.full_name}</DialogTitle>
            <DialogDescription>
              选择该教师可以评价的课程
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto">
            {allCourses.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">暂无课程，请先创建课程</p>
            ) : (
              <div className="space-y-3">
                {majors.map(major => (
                  <div key={major.id}>
                    <p className="font-medium text-sm text-muted-foreground mb-2">{major.name}</p>
                    <div className="space-y-2 pl-4">
                      {major.courses.map(course => (
                        <div 
                          key={course.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer"
                          onClick={() => toggleCourseSelection(course.id)}
                        >
                          <Checkbox 
                            checked={selectedCourseIds.includes(course.id)}
                            onCheckedChange={() => toggleCourseSelection(course.id)}
                          />
                          <span>{course.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeacherAssignDialogOpen(false)}>取消</Button>
            <Button onClick={saveTeacherAssignment} disabled={saving} className="gradient-primary text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存分配
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Assignment Dialog */}
      <Dialog open={studentAssignDialogOpen} onOpenChange={setStudentAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>分配课程给 {selectedStudent?.full_name}</DialogTitle>
            <DialogDescription>
              选择该学生可以学习的课程
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto">
            {allCourses.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">暂无课程，请先创建课程</p>
            ) : (
              <div className="space-y-3">
                {majors.map(major => (
                  <div key={major.id}>
                    <p className="font-medium text-sm text-muted-foreground mb-2">{major.name}</p>
                    <div className="space-y-2 pl-4">
                      {major.courses.map(course => (
                        <div 
                          key={course.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer"
                          onClick={() => toggleCourseSelection(course.id)}
                        >
                          <Checkbox 
                            checked={selectedCourseIds.includes(course.id)}
                            onCheckedChange={() => toggleCourseSelection(course.id)}
                          />
                          <span>{course.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentAssignDialogOpen(false)}>取消</Button>
            <Button onClick={saveStudentAssignment} disabled={saving} className="gradient-primary text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存分配
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
