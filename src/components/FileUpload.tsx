import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Upload,
  X,
  File,
  Image as ImageIcon,
  FileText,
  Video,
  Loader2,
} from 'lucide-react';

interface FileUploadProps {
  userId: string;
  onFilesChange: (urls: string[]) => void;
  existingFiles?: string[];
  maxFiles?: number;
  accept?: string;
  bucket?: string;
}

interface UploadedFile {
  url: string;
  name: string;
  type: string;
}

export function FileUpload({
  userId,
  onFilesChange,
  existingFiles = [],
  maxFiles = 5,
  accept = 'image/*,.pdf,.doc,.docx,.ppt,.pptx',
  bucket = 'submissions',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>(() => 
    existingFiles.map(url => ({
      url,
      name: url.split('/').pop() || 'file',
      type: getFileType(url),
    }))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (const file of Array.from(selectedFiles)) {
        // 验证文件大小 (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`文件 ${file.name} 超过10MB限制`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`上传 ${file.name} 失败`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        newFiles.push({
          url: publicUrl,
          name: file.name,
          type: file.type,
        });
      }

      if (newFiles.length > 0) {
        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        onFilesChange(updatedFiles.map(f => f.url));
        toast.success(`成功上传 ${newFiles.length} 个文件`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles.map(f => f.url));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-primary" />;
    } else if (type.startsWith('video/')) {
      return <Video className="h-5 w-5 text-primary" />;
    } else if (type.includes('pdf')) {
      return <FileText className="h-5 w-5 text-destructive" />;
    } else {
      return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading || files.length >= maxFiles}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">正在上传...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">点击或拖拽上传文件</p>
              <p className="text-sm text-muted-foreground mt-1">
                支持图片、PDF、Word、PPT，单个文件最大10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 已上传文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">已上传 ({files.length}/{maxFiles})</p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getFileIcon(file.type)}
                  <span className="text-sm truncate">{file.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {file.type.startsWith('image/') && (
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      预览
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getFileType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return 'image/' + ext;
  } else if (ext === 'pdf') {
    return 'application/pdf';
  } else if (['doc', 'docx'].includes(ext)) {
    return 'application/msword';
  } else if (['ppt', 'pptx'].includes(ext)) {
    return 'application/vnd.ms-powerpoint';
  } else if (['mp4', 'webm'].includes(ext)) {
    return 'video/' + ext;
  }
  return 'application/octet-stream';
}
