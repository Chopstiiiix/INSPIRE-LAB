"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Globe, Calendar, Star, ExternalLink, Loader2, Flag } from "lucide-react";
import { toggleFollow } from "@/app/actions/feed";
import { createReport } from "@/app/actions/reports";
import { MessageButton } from "@/components/chat/message-button";

interface User {
  id: string;
  name: string | null;
  handle: string | null;
  email: string;
  roleTitle: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar: string | null;
  createdAt: Date;
  userSkills: Array<{
    id: string;
    level: string;
    featured: boolean;
    yearsOfExp: number | null;
    skillTag: {
      id: string;
      name: string;
      category: string | null;
    };
  }>;
  userTools: Array<{
    id: string;
    level: string;
    featured: boolean;
    yearsOfExp: number | null;
    toolTag: {
      id: string;
      name: string;
      category: string | null;
    };
  }>;
  links: Array<{
    id: string;
    label: string;
    url: string;
    order: number;
  }>;
  projects: Array<{
    id: string;
    title: string;
    description: string | null;
    url: string | null;
    status: string;
    visibility: string;
    createdAt: Date;
  }>;
  qualifications: Array<{
    id: string;
    title: string;
    institution: string | null;
    year: string | null;
    description: string | null;
    visibility: string;
  }>;
  _count: {
    followers: number;
    following: number;
  };
}

interface ProfileViewProps {
  user: User;
  isOwner: boolean;
  isFollowing: boolean;
  viewerId: string;
}

export function ProfileView({ user, isOwner, isFollowing }: ProfileViewProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(isFollowing);
  const [followerCount, setFollowerCount] = useState(user._count.followers);
  const [isLoading, setIsLoading] = useState(false);

  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handleToggleFollow = async () => {
    setIsLoading(true);
    const result = await toggleFollow(user.id);

    if (result.success) {
      setFollowing(result.isFollowing!);
      setFollowerCount(result.followersCount!);
    }

    setIsLoading(false);
    router.refresh();
  };

  const handleSubmitReport = async () => {
    if (!reportReason) {
      setReportError("Please select a reason");
      return;
    }

    setIsSubmittingReport(true);
    setReportError(null);

    const result = await createReport({
      reportedId: user.id,
      reason: reportReason as any,
      description: reportDescription || undefined,
    });

    if (result.error) {
      setReportError(result.error);
      setIsSubmittingReport(false);
    } else {
      setIsSubmittingReport(false);
      setReportDialogOpen(false);
      setReportReason("");
      setReportDescription("");
      // Show success message or toast (optional)
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Google-style Profile Header */}
      <div className="mb-8">
        <div className="flex flex-col items-center text-center mb-6">
          <Avatar className="h-[120px] w-[120px] rounded-full border-2 border-border mb-4">
            <AvatarImage src={user.avatar || undefined} alt={user.name || "Avatar"} />
            <AvatarFallback className="text-4xl rounded-full">
              {user.name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-lg text-muted-foreground">@{user.handle}</p>
          {user.roleTitle && (
            <p className="text-base text-muted-foreground mt-1">{user.roleTitle}</p>
          )}

          {user.bio && (
            <p className="text-muted-foreground mt-3 max-w-lg">{user.bio}</p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            {isOwner ? (
              <Link href="/me/settings">
                <Button>Edit Profile</Button>
              </Link>
            ) : (
              <>
                <Button
                  variant={following ? "outline" : "default"}
                  onClick={handleToggleFollow}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : following ? (
                    "Following"
                  ) : (
                    "Follow"
                  )}
                </Button>
                <MessageButton userId={user.id} userName={user.name} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setReportDialogOpen(true)}
                  title="Report user"
                >
                  <Flag className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Meta Info Row */}
        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          {user.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{user.location}</span>
            </div>
          )}
          {user.website && (
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <Globe className="h-4 w-4" />
              <span>{user.website.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Member since {memberSince}</span>
          </div>
        </div>

        {/* Follower/Following Counts */}
        <div className="flex justify-center gap-6 mt-4">
          <div>
            <span className="font-bold">{user._count.following}</span>{" "}
            <span className="text-muted-foreground">Following</span>
          </div>
          <div>
            <span className="font-bold">{followerCount}</span>{" "}
            <span className="text-muted-foreground">Followers</span>
          </div>
        </div>

        {/* Links */}
        {user.links && user.links.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {user.links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills ({user.userSkills.length})</TabsTrigger>
          <TabsTrigger value="tools">Tools ({user.userTools.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({user.projects.length})</TabsTrigger>
          <TabsTrigger value="qualifications">
            Qualifications ({user.qualifications.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {user.userSkills.filter((s) => s.featured).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Featured Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.userSkills
                    .filter((s) => s.featured)
                    .map((userSkill) => (
                      <Badge key={userSkill.id} variant="default" className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        {userSkill.skillTag.name}
                        <span className="text-xs opacity-75">({userSkill.level})</span>
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {user.projects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.projects.slice(0, 3).map((project) => (
                    <div key={project.id} className="border-b border-border pb-4 last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{project.title}</h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{project.status}</Badge>
                          </div>
                        </div>
                        {project.url && (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2"
                          >
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {user.qualifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Qualifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.qualifications.slice(0, 3).map((qual) => (
                    <div key={qual.id} className="border-b border-border pb-3 last:border-0">
                      <h3 className="font-semibold">{qual.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {qual.institution && `${qual.institution}`}
                        {qual.year && ` · ${qual.year}`}
                      </p>
                      {qual.description && (
                        <p className="text-xs text-muted-foreground mt-1">{qual.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          {user.userSkills.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No skills added yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                user.userSkills.reduce((acc, userSkill) => {
                  const category = userSkill.skillTag.category || "Uncategorized";
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(userSkill);
                  return acc;
                }, {} as Record<string, typeof user.userSkills>)
              ).map(([category, skills]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle>{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((userSkill) => (
                        <Badge
                          key={userSkill.id}
                          variant={userSkill.featured ? "default" : "outline"}
                          className="flex items-center gap-1"
                        >
                          {userSkill.featured && <Star className="h-3 w-3 fill-current" />}
                          {userSkill.skillTag.name}
                          <span className="text-xs opacity-75">({userSkill.level})</span>
                          {userSkill.yearsOfExp && (
                            <span className="text-xs opacity-75">· {userSkill.yearsOfExp}y</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools">
          {user.userTools.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No tools added yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                user.userTools.reduce((acc, userTool) => {
                  const category = userTool.toolTag.category || "Uncategorized";
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(userTool);
                  return acc;
                }, {} as Record<string, typeof user.userTools>)
              ).map(([category, tools]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle>{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {tools.map((userTool) => (
                        <Badge
                          key={userTool.id}
                          variant={userTool.featured ? "default" : "outline"}
                          className="flex items-center gap-1"
                        >
                          {userTool.featured && <Star className="h-3 w-3 fill-current" />}
                          {userTool.toolTag.name}
                          <span className="text-xs opacity-75">({userTool.level})</span>
                          {userTool.yearsOfExp && (
                            <span className="text-xs opacity-75">· {userTool.yearsOfExp}y</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          {user.projects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No projects added yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {user.projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{project.title}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{project.status}</Badge>
                          {isOwner && (
                            <Badge variant="secondary">{project.visibility}</Badge>
                          )}
                        </div>
                      </div>
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardHeader>
                  {project.description && (
                    <CardContent>
                      <CardDescription>{project.description}</CardDescription>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Qualifications Tab */}
        <TabsContent value="qualifications">
          {user.qualifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No qualifications added yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {user.qualifications.map((qual) => (
                <Card key={qual.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{qual.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {qual.institution && `${qual.institution}`}
                          {qual.year && ` · ${qual.year}`}
                        </CardDescription>
                        {qual.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {qual.description}
                          </p>
                        )}
                        {isOwner && (
                          <Badge variant="secondary" className="mt-2">{qual.visibility}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Help us understand what's wrong with this profile. Your report will be reviewed by our moderation team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportReason">Reason *</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SPAM">Spam</SelectItem>
                  <SelectItem value="HARASSMENT">Harassment</SelectItem>
                  <SelectItem value="INAPPROPRIATE_CONTENT">Inappropriate Content</SelectItem>
                  <SelectItem value="IMPERSONATION">Impersonation</SelectItem>
                  <SelectItem value="FALSE_INFORMATION">False Information</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportDescription">Additional Details (Optional)</Label>
              <Textarea
                id="reportDescription"
                placeholder="Please provide any additional context..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {reportDescription.length}/1000 characters
              </p>
            </div>
            {reportError && (
              <p className="text-sm text-destructive">{reportError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReportDialogOpen(false);
                setReportReason("");
                setReportDescription("");
                setReportError(null);
              }}
              disabled={isSubmittingReport}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={isSubmittingReport || !reportReason}
            >
              {isSubmittingReport ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
