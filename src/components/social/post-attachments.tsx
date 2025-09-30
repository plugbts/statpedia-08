import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Image as ImageIcon, 
  Video, 
  FileText,
  Download,
  Play,
  Pause,
  X,
  Maximize2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type PostAttachment } from '@/services/social-service';

interface PostAttachmentsProps {
  attachments: PostAttachment[];
}

export const PostAttachments: React.FC<PostAttachmentsProps> = ({ attachments }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const getFileIcon = (attachmentType: string) => {
    switch (attachmentType) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleVideoClick = (attachmentId: string, videoUrl: string) => {
    const video = videoRefs.current[attachmentId];
    if (!video) return;

    if (playingVideos.has(attachmentId)) {
      video.pause();
      setPlayingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(attachmentId);
        return newSet;
      });
    } else {
      // Pause all other videos
      playingVideos.forEach(id => {
        const otherVideo = videoRefs.current[id];
        if (otherVideo) otherVideo.pause();
      });
      
      video.play();
      setPlayingVideos(new Set([attachmentId]));
    }
  };

  const handleVideoEnded = (attachmentId: string) => {
    setPlayingVideos(prev => {
      const newSet = new Set(prev);
      newSet.delete(attachmentId);
      return newSet;
    });
  };

  const handleDownload = (attachment: PostAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.file_url;
    link.download = attachment.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="mt-3 space-y-2">
        {attachments.map((attachment) => (
          <Card key={attachment.id} className="overflow-hidden">
            <CardContent className="p-0">
              {attachment.attachment_type === 'image' ? (
                <div className="relative group">
                  <img
                    src={attachment.file_url}
                    alt={attachment.file_name}
                    className="w-full h-auto max-h-96 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedImage(attachment.file_url)}
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedImage(attachment.file_url)}
                      className="h-8 w-8 p-0"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : attachment.attachment_type === 'video' ? (
                <div className="relative group">
                  <video
                    ref={(el) => {
                      videoRefs.current[attachment.id] = el;
                    }}
                    src={attachment.file_url}
                    className="w-full h-auto max-h-96 object-cover"
                    onEnded={() => handleVideoEnded(attachment.id)}
                    poster={attachment.thumbnail_url}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => handleVideoClick(attachment.id, attachment.file_url)}
                      className="h-12 w-12 rounded-full opacity-80 hover:opacity-100"
                    >
                      {playingVideos.has(attachment.id) ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
                    </Button>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedVideo(attachment.file_url)}
                      className="h-8 w-8 p-0"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        {getFileIcon(attachment.attachment_type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {attachment.file_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {attachment.attachment_type}
                        </Badge>
                        <span>{formatFileSize(attachment.file_size)}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="p-4">
              <img
                src={selectedImage}
                alt="Preview"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Video Preview</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="p-4">
              <video
                src={selectedVideo}
                controls
                className="w-full h-auto max-h-[70vh]"
                autoPlay
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
