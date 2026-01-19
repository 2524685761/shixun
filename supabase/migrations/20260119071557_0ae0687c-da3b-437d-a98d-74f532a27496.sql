-- 添加策略允许用户创建自己的资料（注册时使用）
CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);