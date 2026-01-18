import { useState } from 'react';
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from '../hooks/useTemplates';
import type { Template, CreateTemplatePayload, UpdateTemplatePayload } from '@trinetra/shared';
import Modal from '../components/Modal';
import TemplateForm from '../components/TemplateForm';

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Template | null>(null);

  const handleCreate = () => {
    setEditingTemplate(undefined);
    setShowFormModal(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setShowFormModal(true);
  };

  const handleSubmit = async (data: CreateTemplatePayload | UpdateTemplatePayload) => {
    if (editingTemplate) {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, payload: data });
    } else {
      await createTemplate.mutateAsync(data as CreateTemplatePayload);
    }
    setShowFormModal(false);
  };

  const handleDelete = async () => {
    if (showDeleteConfirm) {
      await deleteTemplate.mutateAsync(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <h1 className="text-xl font-semibold text-gray-100">Templates</h1>
        <button onClick={handleCreate} className="btn-primary">
          Add
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !templates?.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            <p>No templates yet</p>
            <p className="text-sm mt-1">Add one to get started</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-100">{template.name}</h3>
                      {template.autoRun && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                          auto
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 font-mono truncate mt-1">
                      {template.command}
                    </p>
                    {template.preCommands?.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        +{template.preCommands.length} pre-command(s)
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(template)}
                      className="btn-ghost p-2"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(template)}
                      className="btn-ghost p-2 text-red-400"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingTemplate ? 'Edit Template' : 'New Template'}
      >
        <TemplateForm
          template={editingTemplate}
          onSubmit={handleSubmit}
          onCancel={() => setShowFormModal(false)}
          isLoading={createTemplate.isPending || updateTemplate.isPending}
        />
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Template"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete "{showDeleteConfirm?.name}"? This action
            cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteTemplate.isPending}
              className="btn-danger flex-1"
            >
              {deleteTemplate.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
