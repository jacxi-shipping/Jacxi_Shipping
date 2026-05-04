'use client';

import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import PhotoGallery from '@/components/shipments/PhotoGallery';

type UploadProgressItem = {
  name: string;
  progress: number;
};

type ShipmentPhotosTabProps = {
  vehiclePhotos: string[];
  arrivalPhotos: string[];
  canUploadArrivalPhotos: boolean;
  uploading: boolean;
  uploadProgress: UploadProgressItem[];
  onVehiclePhotoClick: (index: number) => void;
  onArrivalPhotoClick: (index: number) => void;
  onDownloadSingle: (url: string, index: number) => void;
  onDownloadAll: (urls: string[], label: string) => void;
  onUploadArrivalPhotos: (files: File[]) => void | Promise<void>;
  onRemoveArrivalPhoto: (index: number) => void | Promise<void>;
};

export default function ShipmentPhotosTab({
  vehiclePhotos,
  arrivalPhotos,
  canUploadArrivalPhotos,
  uploading,
  uploadProgress,
  onVehiclePhotoClick,
  onArrivalPhotoClick,
  onDownloadSingle,
  onDownloadAll,
  onUploadArrivalPhotos,
  onRemoveArrivalPhoto,
}: ShipmentPhotosTabProps) {
  return (
    <div className="space-y-6">
      <DashboardPanel title={`Vehicle Photos${vehiclePhotos.length ? ` (${vehiclePhotos.length})` : ''}`}>
        <PhotoGallery
          photos={vehiclePhotos.map((url) => ({ url, label: 'Vehicle' }))}
          onPhotoClick={onVehiclePhotoClick}
          onDownloadSingle={(url, index) => Promise.resolve(onDownloadSingle(url, index))}
          onDownloadAll={(urls) => Promise.resolve(onDownloadAll(urls, 'Vehicle Photos'))}
        />
      </DashboardPanel>

      <DashboardPanel title={`Arrival Photos${arrivalPhotos.length ? ` (${arrivalPhotos.length})` : ''}`}>
        <PhotoGallery
          photos={arrivalPhotos.map((url) => ({ url, label: 'Arrival' }))}
          onPhotoClick={onArrivalPhotoClick}
          onDownloadSingle={(url, index) => Promise.resolve(onDownloadSingle(url, index))}
          onDownloadAll={(urls) => Promise.resolve(onDownloadAll(urls, 'Arrival Photos'))}
          canUpload={canUploadArrivalPhotos}
          onUpload={(files) => Promise.resolve(onUploadArrivalPhotos(files))}
          onDelete={canUploadArrivalPhotos ? (index) => Promise.resolve(onRemoveArrivalPhoto(index)) : undefined}
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadLabel="Add Arrival Photos"
        />
      </DashboardPanel>
    </div>
  );
}