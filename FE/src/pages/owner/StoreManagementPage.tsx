import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../../components/AdminShell";
import {
  adminPopupAdService,
  type PopupAd,
} from "../../services/popupAdService";
import {
  uploadPopupAdImageFile,
  validatePopupAdImageFile,
} from "../../utils/popupAdImageUpload";

/** datetime-local 값 ↔ API LocalDateTime 문자열 */
function toDatetimeLocalValue(iso: string): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function fromDatetimeLocalValue(value: string): string {
  if (!value) return "";
  return value.length === 16 ? `${value}:00` : value;
}

function formatPeriod(startAt: string, endAt: string): string {
  const fmt = (s: string) => s.replace("T", " ").slice(0, 16);
  return `${fmt(startAt)} ~ ${fmt(endAt)}`;
}

function nowDatetimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isCurrentlyActive(ad: PopupAd): boolean {
  if (!ad.enabled) return false;
  const now = Date.now();
  const start = new Date(ad.startAt).getTime();
  const end = new Date(ad.endAt).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && start <= now && now <= end;
}

export default function StoreManagementPage() {
  const navigate = useNavigate();
  const [ads, setAds] = useState<PopupAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [startAt, setStartAt] = useState(nowDatetimeLocal);
  const [endAt, setEndAt] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAds = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminPopupAdService.getAll();
      setAds(list);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "팝업 광고를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAds();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setImageUrl(null);
    setStartAt(nowDatetimeLocal());
    setEndAt("");
    setEnabled(true);
  };

  const startEdit = (ad: PopupAd) => {
    setEditingId(ad.id);
    setImageUrl(ad.imageUrl);
    setStartAt(toDatetimeLocalValue(ad.startAt));
    setEndAt(toDatetimeLocalValue(ad.endAt));
    setEnabled(ad.enabled);
  };

  const onFileSelected = async (file: File | undefined) => {
    if (!file) return;
    const validationError = validatePopupAdImageFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadPopupAdImageFile(file);
      setImageUrl(url);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      alert("사진을 첨부해 주세요.");
      return;
    }
    if (!startAt || !endAt) {
      alert("게시 기간을 설정해 주세요.");
      return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      alert("종료 시각은 시작 시각보다 이후여야 합니다.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        imageUrl,
        startAt: fromDatetimeLocalValue(startAt),
        endAt: fromDatetimeLocalValue(endAt),
        enabled,
      };
      if (editingId != null) {
        await adminPopupAdService.update(editingId, body);
      } else {
        await adminPopupAdService.create(body);
      }
      resetForm();
      await loadAds();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 팝업 광고를 삭제할까요?")) return;
    try {
      await adminPopupAdService.delete(id);
      if (editingId === id) resetForm();
      await loadAds();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  };

  return (
    <AdminShell>
      <div className="p-[20px] md:p-[32px]">
        <h1 className="text-[24px] font-bold text-black">매장 관리</h1>

        <section className="mt-[28px] max-w-[720px]">
          <h2 className="text-[18px] font-medium tracking-[1px] text-black">팝업 광고</h2>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-[16px] rounded-[25px] border border-black/50 bg-canvas p-[24px]"
          >
            <h3 className="text-[16px] font-medium text-black">
              {editingId != null ? "팝업 수정" : "새 팝업 등록"}
            </h3>

            <label
              className={`relative mt-[16px] flex h-[220px] w-full cursor-pointer flex-col items-center justify-center gap-[8px] overflow-hidden rounded-[20px] border-2 border-dashed border-black/40 bg-black/[0.03] text-black/55 ${
                uploading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="팝업 미리보기"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : (
                <>
                  <span className="text-[15px] font-medium">사진 첨부</span>
                  <span className="text-[13px]">JPG, PNG, WEBP, GIF · 최대 5MB</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploading || saving}
                onChange={(e) => {
                  void onFileSelected(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {uploading && (
              <p className="mt-[8px] text-[13px] text-black/50">이미지 업로드 중…</p>
            )}

            <div className="mt-[16px] grid gap-[12px] sm:grid-cols-2">
              <label className="flex flex-col gap-[6px] text-[13px] text-black/70">
                게시 시작
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="rounded-[12px] border border-black/30 bg-white px-[12px] py-[10px] text-[14px] text-black"
                  required
                />
              </label>
              <label className="flex flex-col gap-[6px] text-[13px] text-black/70">
                게시 종료
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="rounded-[12px] border border-black/30 bg-white px-[12px] py-[10px] text-[14px] text-black"
                  required
                />
              </label>
            </div>

            <label className="mt-[14px] flex items-center gap-[8px] text-[14px] text-black">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-[16px] w-[16px]"
              />
              사용함
            </label>

            <div className="mt-[20px] flex flex-wrap gap-[10px]">
              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-[12px] bg-black px-[20px] py-[10px] text-[14px] font-medium text-canvas disabled:opacity-50"
              >
                {saving ? "저장 중…" : editingId != null ? "수정 저장" : "등록"}
              </button>
              {editingId != null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-[12px] border border-black/30 px-[20px] py-[10px] text-[14px] font-medium text-black"
                >
                  취소
                </button>
              )}
            </div>
          </form>

          <div className="mt-[24px]">
            <h3 className="text-[16px] font-medium text-black">등록된 팝업</h3>
            {loading && (
              <p className="mt-[12px] text-[14px] text-black/50">불러오는 중…</p>
            )}
            {error && (
              <p className="mt-[12px] text-[14px] text-red-600">{error}</p>
            )}
            {!loading && !error && ads.length === 0 && (
              <p className="mt-[12px] text-[14px] text-black/50">등록된 팝업이 없습니다.</p>
            )}
            <ul className="mt-[12px] space-y-[12px]">
              {ads.map((ad) => (
                <li
                  key={ad.id}
                  className="flex flex-col gap-[12px] rounded-[20px] border border-black/40 bg-canvas p-[16px] sm:flex-row sm:items-center"
                >
                  <img
                    src={ad.imageUrl}
                    alt=""
                    className="h-[96px] w-[96px] shrink-0 rounded-[12px] object-cover bg-black/5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] text-black">{formatPeriod(ad.startAt, ad.endAt)}</p>
                    <p className="mt-[4px] text-[13px] text-black/55">
                      {ad.enabled ? "사용 중" : "사용 안 함"}
                      {isCurrentlyActive(ad) ? " · 현재 게시 중" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-[8px]">
                    <button
                      type="button"
                      onClick={() => startEdit(ad)}
                      className="rounded-[10px] border border-black/30 px-[14px] py-[8px] text-[13px] font-medium text-black"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(ad.id)}
                      className="rounded-[10px] border border-red-300 px-[14px] py-[8px] text-[13px] font-medium text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-[40px] max-w-[720px]">
          <h2 className="text-[18px] font-medium tracking-[1px] text-black">리뷰</h2>
          <button
            type="button"
            onClick={() => navigate("/admin/store/reviews")}
            className="mt-[16px] rounded-[12px] border border-black/40 bg-canvas px-[20px] py-[12px] text-[15px] font-medium text-black"
          >
            리뷰 보기
          </button>
        </section>
      </div>
    </AdminShell>
  );
}
