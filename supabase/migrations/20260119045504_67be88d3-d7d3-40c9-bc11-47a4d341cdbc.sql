-- 创建角色枚举类型
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

-- 创建用户角色表（安全存储角色信息）
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 启用 RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 创建安全函数检查用户角色（使用 SECURITY DEFINER 避免递归问题）
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- 创建获取用户角色的函数
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- 用户角色表 RLS 策略
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 创建用户资料表
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    student_id TEXT, -- 学号（学生专用）
    employee_id TEXT, -- 工号（教师/管理员专用）
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 用户资料表 RLS 策略
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view student profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 创建专业表
CREATE TABLE public.majors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view majors"
ON public.majors
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage majors"
ON public.majors
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 创建实训课程表
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    major_id UUID REFERENCES public.majors(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view courses"
ON public.courses
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage courses"
ON public.courses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 创建实训任务表
CREATE TABLE public.training_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_number TEXT NOT NULL UNIQUE, -- 任务编号
    name TEXT NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view tasks"
ON public.training_tasks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage tasks"
ON public.training_tasks
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 创建学生-专业关联表
CREATE TABLE public.student_majors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    major_id UUID REFERENCES public.majors(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, major_id)
);

ALTER TABLE public.student_majors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own major"
ON public.student_majors
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Teachers and admins can view all"
ON public.student_majors
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage student majors"
ON public.student_majors
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 创建教师-课程关联表
CREATE TABLE public.teacher_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);

ALTER TABLE public.teacher_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own courses"
ON public.teacher_courses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all teacher courses"
ON public.teacher_courses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage teacher courses"
ON public.teacher_courses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 创建打卡记录表
CREATE TABLE public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.training_tasks(id) ON DELETE CASCADE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'normal', -- normal, late, absent
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, task_id)
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own check-ins"
ON public.check_ins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Students can create their own check-ins"
ON public.check_ins
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view check-ins for their courses"
ON public.check_ins
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can view all check-ins"
ON public.check_ins
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 创建实训成果表
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.training_tasks(id) ON DELETE CASCADE NOT NULL,
    content TEXT, -- 文字描述
    file_urls TEXT[], -- 文件URLs数组
    status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Students can create their own submissions"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own submissions"
ON public.submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Teachers can view submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update submission status"
ON public.submissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can view all submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 创建评价表
CREATE TABLE public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view evaluations of their submissions"
ON public.evaluations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.id = submission_id AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Teachers can view their own evaluations"
ON public.evaluations
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can create evaluations"
ON public.evaluations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own evaluations"
ON public.evaluations
FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "Admins can view all evaluations"
ON public.evaluations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 创建评语模板表
CREATE TABLE public.comment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- excellent, good, average, poor
    content TEXT NOT NULL,
    is_system BOOLEAN DEFAULT false, -- 系统预设模板
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.comment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view templates"
ON public.comment_templates
FOR SELECT
TO authenticated
USING (
    is_system = true OR 
    teacher_id = auth.uid() OR 
    public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Teachers can manage their own templates"
ON public.comment_templates
FOR ALL
TO authenticated
USING (teacher_id = auth.uid() AND is_system = false)
WITH CHECK (teacher_id = auth.uid() AND is_system = false);

CREATE POLICY "Admins can manage all templates"
ON public.comment_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 添加更新时间戳触发器
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
    BEFORE UPDATE ON public.evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 插入一些系统评语模板
INSERT INTO public.comment_templates (category, content, is_system) VALUES
('excellent', '操作规范，完成出色，展现了扎实的专业技能！', true),
('excellent', '实训过程认真仔细，成果质量优秀，继续保持！', true),
('good', '整体表现良好，注意细节方面还可以再提升。', true),
('good', '基本功扎实，建议多加练习提高熟练度。', true),
('average', '完成了基本要求，但还需要加强练习。', true),
('average', '操作流程基本正确，注意规范性。', true),
('poor', '未达到基本要求，请认真复习后重新提交。', true),
('poor', '操作存在明显问题，建议寻求老师指导后再次尝试。', true);