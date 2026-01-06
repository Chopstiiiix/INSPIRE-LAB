"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Star, Loader2, Edit } from "lucide-react";
import {
  addSkill,
  removeSkill,
  toggleSkillFeatured,
  addTool,
  removeTool,
  toggleToolFeatured,
  createProject,
  updateProject,
  deleteProject,
  createQualification,
  updateQualification,
  deleteQualification,
} from "@/app/actions/profile";

// Type definitions
interface SkillTag {
  id: string;
  name: string;
  category: string | null;
}

interface ToolTag {
  id: string;
  name: string;
  category: string | null;
}

interface UserSkill {
  id: string;
  level: string;
  featured: boolean;
  yearsOfExp: number | null;
  skillTag: SkillTag;
}

interface UserTool {
  id: string;
  level: string;
  featured: boolean;
  yearsOfExp: number | null;
  toolTag: ToolTag;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  status: string;
  visibility: string;
  createdAt: Date;
}

interface Qualification {
  id: string;
  title: string;
  institution: string | null;
  year: string | null;
  description: string | null;
  visibility: string;
}

interface User {
  id: string;
  name: string | null;
  handle: string | null;
  userSkills: UserSkill[];
  userTools: UserTool[];
  projects: Project[];
  qualifications: Qualification[];
}

interface ProfileSettingsProps {
  user: User;
  skillTags: SkillTag[];
  toolTags: ToolTag[];
}

export function ProfileSettings({ user, skillTags, toolTags }: ProfileSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Skills state
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [skillLevel, setSkillLevel] = useState<string>("INTERMEDIATE");

  // Tools state
  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState("");
  const [toolLevel, setToolLevel] = useState<string>("INTERMEDIATE");

  // Projects state
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    url: "",
    status: "ACTIVE",
    visibility: "PUBLIC",
  });

  // Qualifications state
  const [qualDialogOpen, setQualDialogOpen] = useState(false);
  const [editingQual, setEditingQual] = useState<Qualification | null>(null);
  const [qualForm, setQualForm] = useState({
    title: "",
    institution: "",
    year: "",
    description: "",
    visibility: "PUBLIC",
  });

  // Skills handlers
  const handleAddSkill = async () => {
    if (!selectedSkillId) return;
    setIsLoading(true);
    setError(null);

    const result = await addSkill({
      skillTagId: selectedSkillId,
      level: skillLevel as any,
    });

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setSkillDialogOpen(false);
    setSelectedSkillId("");
    setSkillLevel("INTERMEDIATE");
    setIsLoading(false);
    router.refresh();
  };

  const handleRemoveSkill = async (userSkillId: string) => {
    setIsLoading(true);
    const result = await removeSkill(userSkillId);
    setIsLoading(false);
    if (!result.error) {
      router.refresh();
    }
  };

  const handleToggleSkillFeatured = async (userSkillId: string) => {
    setIsLoading(true);
    const result = await toggleSkillFeatured(userSkillId);
    setIsLoading(false);
    if (!result.error) {
      router.refresh();
    }
  };

  // Tools handlers
  const handleAddTool = async () => {
    if (!selectedToolId) return;
    setIsLoading(true);
    setError(null);

    const result = await addTool({
      toolTagId: selectedToolId,
      level: toolLevel as any,
    });

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setToolDialogOpen(false);
    setSelectedToolId("");
    setToolLevel("INTERMEDIATE");
    setIsLoading(false);
    router.refresh();
  };

  const handleRemoveTool = async (userToolId: string) => {
    setIsLoading(true);
    const result = await removeTool(userToolId);
    setIsLoading(false);
    if (!result.error) {
      router.refresh();
    }
  };

  const handleToggleToolFeatured = async (userToolId: string) => {
    setIsLoading(true);
    const result = await toggleToolFeatured(userToolId);
    setIsLoading(false);
    if (!result.error) {
      router.refresh();
    }
  };

  // Projects handlers
  const handleOpenProjectDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        title: project.title,
        description: project.description || "",
        url: project.url || "",
        status: project.status,
        visibility: project.visibility,
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        title: "",
        description: "",
        url: "",
        status: "ACTIVE",
        visibility: "PUBLIC",
      });
    }
    setProjectDialogOpen(true);
  };

  const handleSaveProject = async () => {
    setIsLoading(true);
    setError(null);

    const result = editingProject
      ? await updateProject(editingProject.id, projectForm as any)
      : await createProject(projectForm as any);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setProjectDialogOpen(false);
    setEditingProject(null);
    setIsLoading(false);
    router.refresh();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    setIsLoading(true);
    const result = await deleteProject(projectId);
    setIsLoading(false);
    if (!result.error) {
      router.refresh();
    }
  };

  // Qualifications handlers
  const handleOpenQualDialog = (qual?: Qualification) => {
    if (qual) {
      setEditingQual(qual);
      setQualForm({
        title: qual.title,
        institution: qual.institution || "",
        year: qual.year || "",
        description: qual.description || "",
        visibility: qual.visibility,
      });
    } else {
      setEditingQual(null);
      setQualForm({
        title: "",
        institution: "",
        year: "",
        description: "",
        visibility: "PUBLIC",
      });
    }
    setQualDialogOpen(true);
  };

  const handleSaveQualification = async () => {
    setIsLoading(true);
    setError(null);

    const result = editingQual
      ? await updateQualification(editingQual.id, qualForm as any)
      : await createQualification(qualForm as any);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setQualDialogOpen(false);
    setEditingQual(null);
    setIsLoading(false);
    router.refresh();
  };

  const handleDeleteQualification = async (qualId: string) => {
    if (!confirm("Are you sure you want to delete this qualification?")) return;
    setIsLoading(true);
    const result = await deleteQualification(qualId);
    setIsLoading(false);
    if (!result.error) {
      router.refresh();
    }
  };

  // Group tags by category
  const groupedSkillTags = skillTags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, SkillTag[]>);

  const groupedToolTags = toolTags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, ToolTag[]>);

  // Filter available tags (not already added)
  const availableSkillTags = skillTags.filter(
    (tag) => !user.userSkills.some((us) => us.skillTag.id === tag.id)
  );
  const availableToolTags = toolTags.filter(
    (tag) => !user.userTools.some((ut) => ut.toolTag.id === tag.id)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Profile Settings</h1>
        <Link href={`/u/${user.handle}`}>
          <Button variant="outline">View Profile</Button>
        </Link>
      </div>

      <Tabs defaultValue="skills" className="w-full">
        <TabsList>
          <TabsTrigger value="skills">Skills ({user.userSkills.length})</TabsTrigger>
          <TabsTrigger value="tools">Tools ({user.userTools.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({user.projects.length})</TabsTrigger>
          <TabsTrigger value="qualifications">
            Qualifications ({user.qualifications.length})
          </TabsTrigger>
        </TabsList>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Manage your skills. Click the star icon to feature a skill.
            </p>
            <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Skill
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Skill</DialogTitle>
                  <DialogDescription>
                    Add a new skill to your profile
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="skill">Skill</Label>
                    <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a skill" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(groupedSkillTags).map(([category, tags]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              {category}
                            </div>
                            {tags
                              .filter((tag) => availableSkillTags.some((t) => t.id === tag.id))
                              .map((tag) => (
                                <SelectItem key={tag.id} value={tag.id}>
                                  {tag.name}
                                </SelectItem>
                              ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skillLevel">Level</Label>
                    <Select value={skillLevel} onValueChange={setSkillLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BEGINNER">Beginner</SelectItem>
                        <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                        <SelectItem value="ADVANCED">Advanced</SelectItem>
                        <SelectItem value="EXPERT">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddSkill} disabled={isLoading || !selectedSkillId}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Skill"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {user.userSkills.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No skills added yet. Click "Add Skill" to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                user.userSkills.reduce((acc, userSkill) => {
                  const category = userSkill.skillTag.category;
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(userSkill);
                  return acc;
                }, {} as Record<string, UserSkill[]>)
              ).map(([category, skills]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle>{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {skills.map((userSkill) => (
                        <div
                          key={userSkill.id}
                          className="flex items-center justify-between p-3 border border-border rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleSkillFeatured(userSkill.id)}
                              disabled={isLoading}
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  userSkill.featured ? "fill-current text-yellow-500" : ""
                                }`}
                              />
                            </Button>
                            <div>
                              <p className="font-medium">{userSkill.skillTag.name}</p>
                              <p className="text-sm text-muted-foreground">{userSkill.level}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSkill(userSkill.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Manage your tools and technologies. Click the star icon to feature a tool.
            </p>
            <Dialog open={toolDialogOpen} onOpenChange={setToolDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tool
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Tool</DialogTitle>
                  <DialogDescription>
                    Add a new tool to your profile
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tool">Tool</Label>
                    <Select value={selectedToolId} onValueChange={setSelectedToolId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tool" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(groupedToolTags).map(([category, tags]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              {category}
                            </div>
                            {tags
                              .filter((tag) => availableToolTags.some((t) => t.id === tag.id))
                              .map((tag) => (
                                <SelectItem key={tag.id} value={tag.id}>
                                  {tag.name}
                                </SelectItem>
                              ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toolLevel">Level</Label>
                    <Select value={toolLevel} onValueChange={setToolLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BEGINNER">Beginner</SelectItem>
                        <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                        <SelectItem value="ADVANCED">Advanced</SelectItem>
                        <SelectItem value="EXPERT">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setToolDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTool} disabled={isLoading || !selectedToolId}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Tool"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {user.userTools.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No tools added yet. Click "Add Tool" to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                user.userTools.reduce((acc, userTool) => {
                  const category = userTool.toolTag.category;
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(userTool);
                  return acc;
                }, {} as Record<string, UserTool[]>)
              ).map(([category, tools]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle>{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {tools.map((userTool) => (
                        <div
                          key={userTool.id}
                          className="flex items-center justify-between p-3 border border-border rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleToolFeatured(userTool.id)}
                              disabled={isLoading}
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  userTool.featured ? "fill-current text-yellow-500" : ""
                                }`}
                              />
                            </Button>
                            <div>
                              <p className="font-medium">{userTool.toolTag.name}</p>
                              <p className="text-sm text-muted-foreground">{userTool.level}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTool(userTool.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Manage your projects and showcase your work.
            </p>
            <Button onClick={() => handleOpenProjectDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>

          {user.projects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No projects added yet. Click "Add Project" to get started.
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
                          <Badge variant="secondary">{project.visibility}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenProjectDialog(project)}
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {project.description && (
                    <CardContent>
                      <p className="text-muted-foreground">{project.description}</p>
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline mt-2 inline-block"
                        >
                          {project.url}
                        </a>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Project Dialog */}
          <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProject ? "Edit Project" : "Add Project"}</DialogTitle>
                <DialogDescription>
                  {editingProject ? "Update your project details" : "Add a new project to your profile"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectTitle">Title *</Label>
                  <Input
                    id="projectTitle"
                    value={projectForm.title}
                    onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                    placeholder="Project title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectDescription">Description</Label>
                  <Textarea
                    id="projectDescription"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    placeholder="Describe your project"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectUrl">URL</Label>
                  <Input
                    id="projectUrl"
                    type="url"
                    value={projectForm.url}
                    onChange={(e) => setProjectForm({ ...projectForm, url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectStatus">Status</Label>
                    <Select
                      value={projectForm.status}
                      onValueChange={(value) => setProjectForm({ ...projectForm, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PAUSED">Paused</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectVisibility">Visibility</Label>
                    <Select
                      value={projectForm.visibility}
                      onValueChange={(value) => setProjectForm({ ...projectForm, visibility: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PUBLIC">Public</SelectItem>
                        <SelectItem value="MEMBERS">Members Only</SelectItem>
                        <SelectItem value="FOLLOWERS">Followers Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProject} disabled={isLoading || !projectForm.title}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingProject ? "Update" : "Add Project"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Qualifications Tab */}
        <TabsContent value="qualifications" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Manage your qualifications, certifications, and credentials.
            </p>
            <Button onClick={() => handleOpenQualDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Qualification
            </Button>
          </div>

          {user.qualifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No qualifications added yet. Click "Add Qualification" to get started.
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
                        <p className="text-sm text-muted-foreground mt-1">
                          {qual.institution && `${qual.institution}`}
                          {qual.year && ` · ${qual.year}`}
                        </p>
                        {qual.description && (
                          <p className="text-sm text-muted-foreground mt-2">{qual.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{qual.visibility}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenQualDialog(qual)}
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQualification(qual.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {/* Qualification Dialog */}
          <Dialog open={qualDialogOpen} onOpenChange={setQualDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingQual ? "Edit Qualification" : "Add Qualification"}
                </DialogTitle>
                <DialogDescription>
                  {editingQual ? "Update your qualification details" : "Add a new qualification to your profile"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qualTitle">Title *</Label>
                  <Input
                    id="qualTitle"
                    value={qualForm.title}
                    onChange={(e) => setQualForm({ ...qualForm, title: e.target.value })}
                    placeholder="e.g., AWS Certified Solutions Architect"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualInstitution">Institution</Label>
                  <Input
                    id="qualInstitution"
                    value={qualForm.institution}
                    onChange={(e) => setQualForm({ ...qualForm, institution: e.target.value })}
                    placeholder="e.g., Amazon Web Services"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualYear">Year</Label>
                  <Input
                    id="qualYear"
                    value={qualForm.year}
                    onChange={(e) => setQualForm({ ...qualForm, year: e.target.value })}
                    placeholder="e.g., 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualDescription">Description</Label>
                  <Textarea
                    id="qualDescription"
                    value={qualForm.description}
                    onChange={(e) => setQualForm({ ...qualForm, description: e.target.value })}
                    placeholder="Additional details about this qualification..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualVisibility">Visibility</Label>
                  <Select
                    value={qualForm.visibility}
                    onValueChange={(value) => setQualForm({ ...qualForm, visibility: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="MEMBERS">Members Only</SelectItem>
                      <SelectItem value="FOLLOWERS">Followers Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setQualDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveQualification}
                  disabled={isLoading || !qualForm.title}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingQual ? (
                    "Update"
                  ) : (
                    "Add Qualification"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
