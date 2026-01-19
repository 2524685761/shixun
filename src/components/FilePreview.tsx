import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  File,
  Image as ImageIcon,
  FileText,
  Video,
  Download,
  ExternalLink,
  X,
} from 'lucide-react';

interface FilePreviewProps {
  urls: string[];
  showPreview?: boolean;
}

export function FilePreview({ urls, showPreview = true }: FilePreviewProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!urls || urls.length === 0) return null;

  const getFileInfo = (url: string) => {
    const fileName = url.split('/').pop() || 'file';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    let type: 'image' | 'video' | 'pdf' | 'document' | 'other' = 'other';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      type = 'image';
    } else if (['mp4', 'webm', 'mov'].includes(ext)) {
      type = 'video';
    } else if (ext === 'pdf') {
      type = 'pdf';
    } else if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) {
      type = 'document';
    }

    return { fileName, ext, type };
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-5 w-5 text-primary" />;
      case 'video':
        return <Video className="h-5 w-5 text-primary" />;
      case 'pdf':
        return <FileText className="h-5 w-5 text-destructive" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <>
      <div className="space-y-2">
        {urls.map((url, index) => {
          const { fileName, type } = getFileInfo(url);
          
          return (
            <div key={index} className="flex items-center gap-3">
              {type === 'image' && showPreview ? (
                <div 
                  className="relative w-16 h-16 rounded-lg overflow-hidden bg-secondary cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImage(url)}
                >
                  <img
                    src={url}
                    alt={fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  {getFileIcon(type)}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground uppercase">{type}</p>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 w-8 p-0"
                >
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 w-8 p-0"
                >
                  <a href={url} download={fileName}>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 图片预览弹窗 */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="sm:max-w-[800px] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>图片预览</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                className="w-full h-auto rounded-lg max-h-[70vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
