-- 创建文件存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true);

-- 创建头像存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- 提交文件的存储策略 - 学生可以上传自己的文件
CREATE POLICY "Students can upload their own submission files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 提交文件的存储策略 - 任何人可以查看提交文件（教师需要查看学生提交）
CREATE POLICY "Submission files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'submissions');

-- 学生可以删除自己的文件
CREATE POLICY "Students can delete their own submission files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 头像上传策略 - 用户可以上传自己的头像
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 头像公开访问策略
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 用户可以更新自己的头像
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 用户可以删除自己的头像
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);