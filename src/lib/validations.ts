import { z } from 'zod';

// 通用验证规则
export const emailSchema = z
  .string()
  .trim()
  .min(1, '请输入邮箱')
  .email('请输入有效的邮箱地址')
  .max(255, '邮箱长度不能超过255个字符');

export const passwordSchema = z
  .string()
  .min(8, '密码长度至少8位')
  .max(100, '密码长度不能超过100位')
  .regex(/[a-z]/, '密码需包含小写字母')
  .regex(/[A-Z]/, '密码需包含大写字母')
  .regex(/[0-9]/, '密码需包含数字');

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, '请输入姓名')
  .max(50, '姓名长度不能超过50个字符')
  .regex(/^[\u4e00-\u9fa5a-zA-Z\s]+$/, '姓名只能包含中文、英文和空格');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码')
  .optional()
  .or(z.literal(''));

export const studentIdSchema = z
  .string()
  .trim()
  .max(20, '学号长度不能超过20个字符')
  .regex(/^[a-zA-Z0-9]*$/, '学号只能包含字母和数字')
  .optional()
  .or(z.literal(''));

export const employeeIdSchema = z
  .string()
  .trim()
  .max(20, '工号长度不能超过20个字符')
  .regex(/^[a-zA-Z0-9]*$/, '工号只能包含字母和数字')
  .optional()
  .or(z.literal(''));

// 登录表单
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '请输入密码'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

// 注册表单
export const registerFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, '请确认密码'),
  fullName: fullNameSchema,
  studentId: studentIdSchema,
}).refine(data => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

// 个人资料表单
export const profileFormSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  studentId: studentIdSchema,
  employeeId: employeeIdSchema,
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

// 专业表单
export const majorFormSchema = z.object({
  name: z.string().trim().min(1, '请输入专业名称').max(100, '专业名称不能超过100个字符'),
  description: z.string().trim().max(500, '描述不能超过500个字符').optional(),
});

export type MajorFormValues = z.infer<typeof majorFormSchema>;

// 课程表单
export const courseFormSchema = z.object({
  name: z.string().trim().min(1, '请输入课程名称').max(100, '课程名称不能超过100个字符'),
  description: z.string().trim().max(500, '描述不能超过500个字符').optional(),
  majorId: z.string().uuid('请选择专业'),
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;

// 任务表单
export const taskFormSchema = z.object({
  name: z.string().trim().min(1, '请输入任务名称').max(100, '任务名称不能超过100个字符'),
  taskNumber: z.string().trim().min(1, '请输入任务编号').max(20, '任务编号不能超过20个字符'),
  description: z.string().trim().max(1000, '描述不能超过1000个字符').optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请选择有效日期'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, '请输入有效时间').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, '请输入有效时间').optional(),
  courseId: z.string().uuid('请选择课程'),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

// 提交成果表单
export const submissionFormSchema = z.object({
  taskId: z.string().uuid('请选择任务'),
  content: z.string().trim().max(5000, '内容不能超过5000个字符').optional(),
  fileUrls: z.array(z.string().url()).max(5, '最多上传5个文件').optional(),
}).refine(data => (data.content && data.content.length > 0) || (data.fileUrls && data.fileUrls.length > 0), {
  message: '请填写成果内容或上传文件',
  path: ['content'],
});

export type SubmissionFormValues = z.infer<typeof submissionFormSchema>;

// 评价表单
export const evaluationFormSchema = z.object({
  score: z.number().min(0, '分数不能小于0').max(100, '分数不能超过100'),
  comment: z.string().trim().max(1000, '评语不能超过1000个字符').optional(),
});

export type EvaluationFormValues = z.infer<typeof evaluationFormSchema>;

// 评语模板表单
export const commentTemplateFormSchema = z.object({
  category: z.string().trim().min(1, '请选择分类'),
  content: z.string().trim().min(1, '请输入评语内容').max(500, '评语内容不能超过500个字符'),
});

export type CommentTemplateFormValues = z.infer<typeof commentTemplateFormSchema>;

// 验证辅助函数
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach(err => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}

// 单字段验证
export function validateField<T>(schema: z.ZodSchema<T>, value: unknown): string | null {
  const result = schema.safeParse(value);
  if (result.success) {
    return null;
  }
  return result.error.errors[0]?.message || '验证失败';
}
