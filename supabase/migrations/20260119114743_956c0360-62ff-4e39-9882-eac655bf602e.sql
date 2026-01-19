-- 创建学生-课程关联表（类似教师-课程）
CREATE TABLE public.student_courses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- 启用RLS
ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;

-- 管理员可以管理
CREATE POLICY "Admins can manage student courses"
ON public.student_courses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 学生可以查看自己的课程分配
CREATE POLICY "Students can view their own courses"
ON public.student_courses
FOR SELECT
USING (auth.uid() = user_id);

-- 教师和管理员可以查看所有
CREATE POLICY "Teachers and admins can view all"
ON public.student_courses
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));