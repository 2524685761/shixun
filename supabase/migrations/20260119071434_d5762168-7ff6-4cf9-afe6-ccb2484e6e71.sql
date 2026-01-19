-- 添加策略允许用户创建自己的角色（注册时使用）
CREATE POLICY "Users can create their own role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 同样检查 profiles 表的策略
-- 先查看 profiles 表是否有允许用户创建自己资料的策略