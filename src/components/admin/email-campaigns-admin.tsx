import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  Send, 
  BarChart3, 
  Users, 
  Calendar, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Play,
  Pause,
  TrendingUp,
  Target,
  Clock
} from 'lucide-react';
import { emailService, type EmailCampaign, type EmailTemplate, type EmailAnalytics } from '@/services/email-service';
import { useToast } from '@/hooks/use-toast';

export const EmailCampaignsAdmin: React.FC = () => {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [analytics, setAnalytics] = useState<EmailAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    template_type: 'subscription',
    content: '',
    html_content: '',
    target_audience: 'non_subscribed',
    scheduled_at: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [campaignsData, templatesData] = await Promise.all([
        emailService.getCampaigns(),
        emailService.getEmailTemplates()
      ]);
      
      setCampaigns(campaignsData);
      setTemplates(templatesData);
      
      if (campaignsData.length > 0) {
        const analyticsData = await emailService.getCampaignAnalytics(campaignsData[0].id);
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load email campaigns data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const template = templates.find(t => t.template_type === formData.template_type);
      if (!template) {
        toast({
          title: "Error",
          description: "Template not found",
          variant: "destructive"
        });
        return;
      }

      const campaign = {
        name: formData.name,
        subject: formData.subject || template.subject_template,
        template_type: formData.template_type,
        content: formData.content || template.content_template,
        html_content: formData.html_content || template.html_template,
        target_audience: formData.target_audience as 'non_subscribed' | 'free_trial' | 'all',
        is_active: true,
        scheduled_at: formData.scheduled_at || null,
        sent_at: null
      };

      await emailService.createCampaign(campaign);
      await loadData();
      
      setShowCreateForm(false);
      setFormData({
        name: '',
        subject: '',
        template_type: 'subscription',
        content: '',
        html_content: '',
        target_audience: 'non_subscribed',
        scheduled_at: ''
      });

      toast({
        title: "Success",
        description: "Email campaign created successfully"
      });
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast({
        title: "Error",
        description: "Failed to create email campaign",
        variant: "destructive"
      });
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      const users = await emailService.getNonSubscribedUsers(1000);
      const userIds = users.map(u => u.user_id);
      
      await emailService.sendCampaign(campaignId, userIds);
      
      toast({
        title: "Success",
        description: `Campaign sent to ${userIds.length} users`
      });
      
      await loadData();
    } catch (error) {
      console.error('Failed to send campaign:', error);
      toast({
        title: "Error",
        description: "Failed to send email campaign",
        variant: "destructive"
      });
    }
  };

  const handleScheduleAutomated = async () => {
    try {
      await emailService.scheduleAutomatedCampaigns();
      await loadData();
      
      toast({
        title: "Success",
        description: "Automated campaigns scheduled successfully"
      });
    } catch (error) {
      console.error('Failed to schedule automated campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to schedule automated campaigns",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (campaign: EmailCampaign) => {
    if (campaign.sent_at) {
      return <Badge variant="default" className="bg-green-500">Sent</Badge>;
    } else if (campaign.scheduled_at && new Date(campaign.scheduled_at) > new Date()) {
      return <Badge variant="secondary">Scheduled</Badge>;
    } else if (campaign.is_active) {
      return <Badge variant="outline">Active</Badge>;
    } else {
      return <Badge variant="destructive">Inactive</Badge>;
    }
  };

  const getTemplateTypeIcon = (type: string) => {
    switch (type) {
      case 'subscription': return <Target className="w-4 h-4" />;
      case 'sale': return <TrendingUp className="w-4 h-4" />;
      case 'effectiveness': return <BarChart3 className="w-4 h-4" />;
      case 'testimonial': return <Users className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Campaigns</h2>
          <p className="text-muted-foreground">
            Manage email marketing campaigns for non-subscribed users
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleScheduleAutomated} variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Automated
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTemplateTypeIcon(campaign.template_type)}
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      {getStatusBadge(campaign)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!campaign.sent_at && (
                        <Button
                          size="sm"
                          onClick={() => handleSendCampaign(campaign.id)}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {campaign.template_type.charAt(0).toUpperCase() + campaign.template_type.slice(1)} • 
                    Target: {campaign.target_audience.replace('_', ' ')}
                    {campaign.scheduled_at && (
                      <span> • Scheduled: {new Date(campaign.scheduled_at).toLocaleDateString()}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {campaign.content.substring(0, 150)}...
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getTemplateTypeIcon(template.template_type)}
                    <CardTitle>{template.name}</CardTitle>
                    <Badge variant="outline">{template.template_type}</Badge>
                  </div>
                  <CardDescription>
                    Subject: {template.subject_template}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {template.content_template.substring(0, 200)}...
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
                <p className="text-xs text-muted-foreground">
                  {campaigns.filter(c => c.sent_at).length} sent
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.is_active && !c.sent_at).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready to send
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
                <p className="text-xs text-muted-foreground">
                  Available templates
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <Card className="fixed inset-4 z-50 overflow-auto">
          <CardHeader>
            <CardTitle>Create Email Campaign</CardTitle>
            <CardDescription>
              Create a new email campaign for non-subscribed users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter campaign name"
                />
              </div>
              <div>
                <Label htmlFor="template_type">Template Type</Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value) => setFormData({ ...formData, template_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="effectiveness">Effectiveness</SelectItem>
                    <SelectItem value="testimonial">Testimonial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter email subject"
              />
            </div>

            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter email content"
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="scheduled_at">Schedule (Optional)</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign}>
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <Card className="fixed inset-4 z-50 overflow-auto">
          <CardHeader>
            <CardTitle>{selectedCampaign.name}</CardTitle>
            <CardDescription>
              {selectedCampaign.template_type} • {selectedCampaign.target_audience}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Subject</Label>
              <p className="text-sm font-medium">{selectedCampaign.subject}</p>
            </div>
            <div>
              <Label>Content</Label>
              <div className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">
                {selectedCampaign.content}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedCampaign(null)}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
