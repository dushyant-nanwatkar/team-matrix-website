export interface ProjectStat {
  label: string;
  value: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  description: string;
  year?: string;
  /** Public path to 3D model, e.g. /objects/GOLDEN CLAW SOCCAR.obj */
  modelUrl: string;
  /** Optional public path to material file, e.g. /objects/ROVER v3.mtl */
  mtlUrl?: string;
  /** Optional thumbnail or poster image */
  previewImage?: string;
  tags?: string[];
  stats?: ProjectStat[];
  featured?: boolean;
  createdAt?: string;
}
