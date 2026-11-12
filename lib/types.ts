export type DocumentRow = {
  id: string;
  owner_id: string;
  title: string;
  content: unknown; // TipTap JSONContent
  created_at: string;
  updated_at: string;
};

export type ShareRow = {
  id: string;
  document_id: string;
  shared_with_id: string;
  created_at: string;
};

export type DocumentWithAccess = DocumentRow & {
  access: "owner" | "shared";
};
