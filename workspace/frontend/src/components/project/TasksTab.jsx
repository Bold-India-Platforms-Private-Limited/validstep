import { useState } from "react";
import { Plus } from "lucide-react";
import Button from "../ui/Button";
import TaskBoard from "./TaskBoard";
import CreateTaskModal from "./CreateTaskModal";

export default function TasksTab({ project, workspaceId, isAdmin }) {
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        {isAdmin && (
          <Button onClick={() => setTaskModalOpen(true)}>
            <Plus size={16} /> New Task
          </Button>
        )}
      </div>
      <TaskBoard projectId={project.id} workspaceId={workspaceId} canManage={isAdmin} />
      <CreateTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        projectId={project.id}
        projectGroups={project.groups || []}
      />
    </div>
  );
}
