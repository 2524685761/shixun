import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ClipboardCheck, 
  Calendar,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Filter,
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface CheckInRecord {
  id: string;
  check_in_time: string;
  status: string;
  user_id: string;
  profile?: {
    full_name: string;
    student_id: string | null;
  };
  task: {
    name: string;
    task_number: string;
    scheduled_date: string;
  };
}

interface Task {
  id: string;
  name: string;
  task_number: string;
  scheduled_date: string;
}

export default function Attendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    normal: 0,
    late: 0,
    absent: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 获取最近7天的任务
      const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const { data: tasksData } = await supabase
        .from('training_tasks')
        .select('id, name, task_number, scheduled_date')
        .gte('scheduled_date', startDate)
        .order('scheduled_date', { ascending: false });

      setTasks(tasksData || []);

      // 获取打卡记录
      const { data: checkInsData, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          check_in_time,
          status,
          user_id,
          task:training_tasks(name, task_number, scheduled_date)
        `)
        .order('check_in_time', { ascending: false })
        .limit(100);

      if (error) throw error;

      // 获取用户资料
      const userIds = [...new Set(checkInsData?.map(c => c.user_id) || [])];
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

      const checkInsWithProfiles = (checkInsData || []).map(c => ({
        ...c,
        profile: profilesMap[c.user_id],
      })) as unknown as CheckInRecord[];

      setCheckIns(checkInsWithProfiles);

      // 统计数据
      const normal = checkInsWithProfiles.filter(c => c.status === 'normal').length;
      const late = checkInsWithProfiles.filter(c => c.status === 'late').length;
      const absent = checkInsWithProfiles.filter(c => c.status === 'absent').length;
      
      setStats({
        total: checkInsWithProfiles.length,
        normal,
        late,
        absent,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredCheckIns = checkIns.filter(record => {
    const taskMatch = selectedTask === 'all' || 
      tasks.find(t => t.id === selectedTask)?.task_number === record.task?.task_number;
    const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
    const matchesSearch = !searchTerm || 
      record.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.profile?.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return taskMatch && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">正常</Badge>;
      case 'late':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">迟到</Badge>;
      case 'absent':
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">缺勤</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
          <ClipboardCheck className="h-6 w-6 text-primary" />
          考勤管理
        </h1>
        <p className="text-muted-foreground mt-1">
          查看和管理学生考勤记录
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总打卡数</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">正常</p>
                <p className="text-2xl font-bold mt-1 text-success">{stats.normal}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">迟到</p>
                <p className="text-2xl font-bold mt-1 text-warning">{stats.late}</p>
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
                <p className="text-sm text-muted-foreground">缺勤</p>
                <p className="text-2xl font-bold mt-1 text-destructive">{stats.absent}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索学生姓名或学号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="选择任务" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部任务</SelectItem>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="normal">正常</SelectItem>
                <SelectItem value="late">迟到</SelectItem>
                <SelectItem value="absent">缺勤</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 打卡记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">打卡记录</CardTitle>
          <CardDescription>
            共 {filteredCheckIns.length} 条记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCheckIns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无打卡记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCheckIns.map((record) => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {record.profile?.full_name?.slice(0, 1) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{record.profile?.full_name || '未知用户'}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.profile?.student_id || '无学号'} · {record.task?.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {getStatusBadge(record.status)}
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(parseISO(record.check_in_time), 'HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(record.check_in_time), 'MM/dd')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
