import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Paperclip, 
  X, 
  Image as ImageIcon, 
  Video, 
  FileText,
  Download,
  Play,
  Pause,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { validateFile, detectSuspiciousPatterns, logSecurityEvent } from '@/utils/security';

interface FileAttachmentProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
}

interface AttachedFile {
  file: File;
  id: string;
  preview?: string;
}

export const FileAttachment: React.FC<FileAttachmentProps> = ({ 
  onFilesSelected, 
  maxFiles = 4,
  maxFileSize = 10 
}) => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFileSecurity = (file: File): string | null => {
    // Enhanced security validation
    const validation = validateFile(file, {
      maxSize: maxFileSize * 1024 * 1024, // Convert MB to bytes
      allowedTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png', 
        'image/gif',
        'video/mp4',
        'video/quicktime'
      ],
      allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov']
    });

    if (!validation.isValid) {
      return validation.errors[0];
    }

    // Check for suspicious patterns in filename
    const suspiciousCheck = detectSuspiciousPatterns(file.name);
    if (suspiciousCheck.isSuspicious) {
      logSecurityEvent('Suspicious file upload attempt', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        patterns: suspiciousCheck.patterns
      });
      return 'File name contains suspicious patterns';
    }

    // Additional security checks
    if (file.name.length > 255) {
      return 'File name too long';
    }

    // Check for double extensions (potential security risk)
    const nameParts = file.name.split('.');
    if (nameParts.length > 2) {
      const lastTwo = nameParts.slice(-2);
      const suspiciousExtensions = ['exe', 'bat', 'cmd', 'scr', 'pif', 'com'];
      if (suspiciousExtensions.includes(lastTwo[0].toLowerCase())) {
        logSecurityEvent('Suspicious file extension detected', {
          fileName: file.name,
          suspiciousExtension: lastTwo[0]
        });
        return 'File type not allowed for security reasons';
      }
    }

    return null;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getFileType = (fileType: string): 'image' | 'video' | 'document' => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    return 'document';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (attachedFiles.length + files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only attach up to ${maxFiles} files`,
        variant: "destructive"
      });
      return;
    }

    const validFiles: AttachedFile[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const error = validateFileSecurity(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        const attachedFile: AttachedFile = {
          file,
          id: `${Date.now()}-${Math.random().toString(36).substring(2)}`
        };

        // Create preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            attachedFile.preview = e.target?.result as string;
            setAttachedFiles(prev => [...prev, attachedFile]);
          };
          reader.readAsDataURL(file);
        } else {
          validFiles.push(attachedFile);
        }
      }
    });

    if (errors.length > 0) {
      toast({
        title: "File validation errors",
        description: errors.join(', '),
        variant: "destructive"
      });
    }

    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleAttachFiles = () => {
    if (attachedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to attach",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          onFilesSelected(attachedFiles.map(f => f.file));
          setAttachedFiles([]);
          toast({
            title: "Files attached",
            description: `${attachedFiles.length} file(s) attached to your post`
          });
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={attachedFiles.length >= maxFiles}
          className="gap-2"
        >
          <Paperclip className="w-4 h-4" />
          Attach Files
        </Button>
        <span className="text-xs text-muted-foreground">
          {attachedFiles.length}/{maxFiles} files
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.gif,.mp4,.mov"
        onChange={handleFileSelect}
        className="hidden"
      />

      {attachedFiles.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="space-y-2">
              {attachedFiles.map((attachedFile) => (
                <div key={attachedFile.id} className="flex items-center gap-3 p-2 border rounded-lg">
                  <div className="flex-shrink-0">
                    {attachedFile.preview ? (
                      <img 
                        src={attachedFile.preview} 
                        alt="Preview" 
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        {getFileIcon(attachedFile.file.type)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {attachedFile.file.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {getFileType(attachedFile.file.type)}
                      </Badge>
                      <span>{formatFileSize(attachedFile.file.size)}</span>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(attachedFile.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading files...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}
              
              {!isUploading && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAttachFiles}
                    className="flex-1"
                  >
                    Attach to Post
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAttachedFiles([])}
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
