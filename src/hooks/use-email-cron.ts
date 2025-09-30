import { useEffect } from 'react';
import { emailCronService } from '@/services/email-cron';

export const useEmailCron = () => {
  useEffect(() => {
    // Start the email cron service when the hook is used
    emailCronService.start();

    // Cleanup on unmount
    return () => {
      emailCronService.stop();
    };
  }, []);

  return {
    status: emailCronService.getStatus()
  };
};
