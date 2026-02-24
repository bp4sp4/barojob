"use client";

import Image from "next/image";
import Script from "next/script";
import { useState, useCallback, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./stepflow.module.css";

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: KakaoPostcodeData) => void;
      }) => { open: () => void };
    };
  }
}

interface KakaoPostcodeData {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  addressType: string;
}

const formatClickSource = (
  utmSource: string,
  materialId: string | null,
  blogId: string | null = null,
  cafeId: string | null = null,
): string => {
  const sourceMap: { [key: string]: string } = {
    daangn: "당근",
    insta: "인스타",
    facebook: "페이스북",
    google: "구글",
    youtube: "유튜브",
    kakao: "카카오",
    naver: "네이버",
    naverblog: "네이버블로그",
    toss: "토스",
    mamcafe: "맘카페",
  };

  const shortSource = sourceMap[utmSource] || utmSource;
  const homepageName = "취업지원신청";

  if (blogId) return `${homepageName}_${shortSource}_${blogId}`;
  if (cafeId) return `${homepageName}_${shortSource}_${cafeId}`;
  if (materialId) return `${homepageName}_${shortSource}_소재_${materialId}`;
  return `${homepageName}_${shortSource}`;
};

function ClickSourceHandler({
  onSourceChange,
}: {
  onSourceChange: (source: string) => void;
}) {
  const searchParams = useSearchParams();

  const utmSource = searchParams.get("utm_source");
  const materialId = searchParams.get("material_id");
  const blogId = searchParams.get("blog_id");
  const cafeId = searchParams.get("cafe_id");

  if (utmSource) {
    const formatted = formatClickSource(utmSource, materialId, blogId, cafeId);
    onSourceChange(formatted);
  }

  return null;
}

const EMPLOYMENT_TYPES = ["정규직", "계약직", "파트타임", "부업"];

function EmploymentFormContent({ clickSource }: { clickSource: string }) {
  const [step, setStep] = useState(2);
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    contact: "",
    birth_date: "",
    address: "",
    address_detail: "",
    zonecode: "",
    desired_job_field: "",
    employment_types: [] as string[],
    has_resume: "",
    certifications: "",
  });
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPaymentNoticeModal, setShowPaymentNoticeModal] = useState(false);

  // URL 파라미터로 결제 완료 감지 (팝업/모바일 리다이렉트 후)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success" && params.get("step") === "3") {
      setStep(3);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const formatContact = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  const validateContact = (contact: string) => {
    const cleaned = contact.replace(/[-\s]/g, "");
    if (cleaned.length === 0) {
      setContactError("");
      return true;
    }
    if (!cleaned.startsWith("010") && !cleaned.startsWith("011")) {
      setContactError("010 또는 011로 시작하는 번호를 입력해주세요");
      return false;
    }
    setContactError("");
    return true;
  };

  const formatBirthDate = (value: string) => {
    return value.replace(/[^0-9]/g, "").slice(0, 6);
  };

  const openAddressSearch = () => {
    if (typeof window !== "undefined" && window.daum) {
      new window.daum.Postcode({
        oncomplete: (data: KakaoPostcodeData) => {
          const addr = data.roadAddress || data.jibunAddress;
          setFormData((prev) => ({
            ...prev,
            address: addr,
            zonecode: data.zonecode,
          }));
        },
      }).open();
    }
  };

  const toggleEmploymentType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      employment_types: prev.employment_types.includes(type)
        ? prev.employment_types.filter((t) => t !== type)
        : [...prev.employment_types, type],
    }));
  };

  // 프로그레시브 디스클로저 조건
  const showGender = formData.name.trim().length > 0;
  const showContact = showGender && formData.gender.length > 0;
  const showBirthDate =
    showContact &&
    formData.contact.replace(/[-\s]/g, "").length >= 10 &&
    !contactError;
  const showAddress = showBirthDate && formData.birth_date.length >= 6;
  const showDesiredJobField = showAddress && formData.address.length > 0;
  const showEmploymentTypes =
    showDesiredJobField && formData.desired_job_field.trim().length > 0;
  const showHasResume =
    showEmploymentTypes && formData.employment_types.length > 0;
  const showCertifications = showHasResume && formData.has_resume.length > 0;
  const showPayment = showCertifications;

  // 프로그레스 바 계산
  const filledFields = [
    formData.name.trim().length > 0,
    formData.gender.length > 0,
    formData.contact.replace(/[-\s]/g, "").length >= 10 && !contactError,
    formData.birth_date.length >= 6,
    formData.address.length > 0,
    formData.desired_job_field.trim().length > 0,
    formData.employment_types.length > 0,
    formData.has_resume.length > 0,
    privacyAgreed,
    termsAgreed,
  ].filter(Boolean).length;
  const totalFields = 10;
  const progress = (filledFields / totalFields) * 100;

  const isFormValid =
    formData.name.trim().length > 0 &&
    formData.gender.length > 0 &&
    formData.contact.replace(/[-\s]/g, "").length >= 10 &&
    !contactError &&
    formData.birth_date.length >= 6 &&
    formData.address.length > 0 &&
    formData.desired_job_field.trim().length > 0 &&
    formData.employment_types.length > 0 &&
    formData.has_resume.length > 0 &&
    privacyAgreed &&
    termsAgreed;

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setLoading(true);
    try {
      const submitData = {
        name: formData.name,
        gender: formData.gender,
        contact: formData.contact,
        birth_date: formData.birth_date,
        address: formData.address,
        address_detail: formData.address_detail || null,
        zonecode: formData.zonecode || null,
        desired_job_field: formData.desired_job_field,
        employment_types: formData.employment_types,
        has_resume: formData.has_resume === "보유함",
        certifications: formData.certifications || null,
        payment_amount: 220000,
        privacy_agreed: privacyAgreed,
        terms_agreed: termsAgreed,
        click_source: clickSource,
      };

      const response = await fetch("/api/employment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "저장에 실패했습니다.");
      }

      const responseData = await response.json();

      if (responseData.payurl) {
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
          );
        if (isMobile) {
          window.location.href = responseData.payurl;
        } else {
          window.open(
            responseData.payurl,
            "payapp_payment",
            "width=800,height=900,left=200,top=100",
          );
        }
      } else {
        setStep(3);
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "저장에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />

      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.logoContainer}>
            <Image
              src="/logo.png"
              alt="한평생교육"
              width={130}
              height={34}
              className={styles.logo}
            />
          </div>
        </header>

        <AnimatePresence mode="wait">
          {/* STEP 2: 신청 폼 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={styles.stepWrapper}
            >
              {/* 프로그레스 바 */}
              <div className={styles.progressContainer}>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className={styles.progressText}>{Math.round(progress)}%</p>
              </div>

              <div className={styles.step2Title}>
                <h1 className={styles.step2TitleText}>취업지원 신청</h1>
              </div>

              {/* 이름 */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  이름<span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="이름을 입력해주세요"
                  className={styles.inputField}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  autoFocus
                />
              </div>

              {/* 성별 */}
              {showGender && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    성별<span className={styles.required}>*</span>
                  </label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="gender"
                        value="여"
                        checked={formData.gender === "여"}
                        onChange={(e) =>
                          setFormData({ ...formData, gender: e.target.value })
                        }
                        className={styles.radio}
                      />
                      <span>여성</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="gender"
                        value="남"
                        checked={formData.gender === "남"}
                        onChange={(e) =>
                          setFormData({ ...formData, gender: e.target.value })
                        }
                        className={styles.radio}
                      />
                      <span>남성</span>
                    </label>
                  </div>
                </motion.div>
              )}

              {/* 연락처 */}
              {showContact && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    연락처<span className={styles.required}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="연락처를 입력해주세요"
                    className={styles.inputField}
                    value={formData.contact}
                    onChange={(e) => {
                      const formatted = formatContact(e.target.value);
                      setFormData({ ...formData, contact: formatted });
                      validateContact(formatted);
                    }}
                  />
                  {contactError && (
                    <p className={styles.errorMessage}>{contactError}</p>
                  )}
                </motion.div>
              )}

              {/* 생년월일 */}
              {showBirthDate && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    생년월일<span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="생년월일 6자리를 입력해주세요"
                    className={styles.inputField}
                    value={formData.birth_date}
                    maxLength={6}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        birth_date: formatBirthDate(e.target.value),
                      })
                    }
                  />
                </motion.div>
              )}

              {/* 주소 */}
              {showAddress && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    주소<span className={styles.required}>*</span>
                  </label>
                  <button
                    type="button"
                    className={styles.addressSearchBtn}
                    onClick={openAddressSearch}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    주소 검색
                  </button>
                  <input
                    type="text"
                    placeholder="주소를 검색해주세요"
                    className={styles.inputField}
                    value={formData.address}
                    readOnly
                    style={{ marginTop: 8, cursor: "pointer" }}
                    onClick={openAddressSearch}
                  />
                  {formData.address && (
                    <input
                      type="text"
                      placeholder="상세 주소를 입력해주세요"
                      className={styles.inputField}
                      style={{ marginTop: 8 }}
                      value={formData.address_detail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address_detail: e.target.value,
                        })
                      }
                    />
                  )}
                  <p className={styles.addressNote}>
                    *거주지 근처로 취업지원 신청이 진행됩니다
                  </p>
                </motion.div>
              )}

              {/* 취업 희망분야 */}
              {showDesiredJobField && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    취업 희망분야<span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="취업 희망 분야를 작성해주세요(ex. 노인복지)"
                    className={styles.inputField}
                    value={formData.desired_job_field}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        desired_job_field: e.target.value,
                      })
                    }
                  />
                </motion.div>
              )}

              {/* 고용형태 */}
              {showEmploymentTypes && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    고용형태<span className={styles.required}>*</span>
                  </label>
                  <div className={styles.checkboxGroup}>
                    {EMPLOYMENT_TYPES.map((type) => (
                      <label key={type} className={styles.checkboxItem}>
                        <input
                          type="checkbox"
                          checked={formData.employment_types.includes(type)}
                          onChange={() => toggleEmploymentType(type)}
                          className={styles.checkbox}
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 자기소개서·이력서 보유 여부 */}
              {showHasResume && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    자기소개서·이력서 보유 여부
                    <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="has_resume"
                        value="보유함"
                        checked={formData.has_resume === "보유함"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            has_resume: e.target.value,
                          })
                        }
                        className={styles.radio}
                      />
                      <span>보유함</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="has_resume"
                        value="보유하지않음"
                        checked={formData.has_resume === "보유하지않음"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            has_resume: e.target.value,
                          })
                        }
                        className={styles.radio}
                      />
                      <span>보유하지 않음</span>
                    </label>
                  </div>
                </motion.div>
              )}

              {/* 보유중인 자격증 */}
              {showCertifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>보유중인 자격증</label>
                  <input
                    type="text"
                    placeholder="취득하신 자격증이 있다면 작성해주세요"
                    className={styles.inputField}
                    value={formData.certifications}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        certifications: e.target.value,
                      })
                    }
                  />
                </motion.div>
              )}

              {/* 결제 금액 + 동의 + 버튼 */}
              {showPayment && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={styles.paymentBox}>
                    <span className={styles.paymentLabel}>결제 금액</span>
                    <span className={styles.paymentAmount}>220,000원</span>
                  </div>

                  <div className={styles.agreementSection}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={privacyAgreed}
                        onChange={(e) => setPrivacyAgreed(e.target.checked)}
                        className={styles.checkbox}
                      />
                      <span>
                        <button
                          type="button"
                          onClick={() => setShowPrivacyModal(true)}
                          className={styles.agreementLink}
                        >
                          개인정보처리방침
                        </button>{" "}
                        동의{" "}
                        <span className={styles.requiredBadge}>(필수)</span>
                      </span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className={styles.checkbox}
                      />
                      <span>
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className={styles.agreementLink}
                        >
                          이용약관
                        </button>{" "}
                        및{" "}
                        <button
                          type="button"
                          onClick={() => setShowPaymentNoticeModal(true)}
                          className={styles.agreementLink}
                        >
                          결제유의사항
                        </button>{" "}
                        동의{" "}
                        <span className={styles.requiredBadge}>(필수)</span>
                      </span>
                    </label>
                  </div>

                  <button
                    className={styles.bottomButton}
                    disabled={!isFormValid || loading}
                    onClick={handleSubmit}
                  >
                    {loading ? "처리 중..." : "결제하기"}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 3: 완료 화면 */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`${styles.stepWrapper} ${styles.step3Container}`}
            >
              <Image
                src="/complete-check.png"
                alt="Done"
                width={300}
                height={300}
                priority
                className={styles.step3Image}
              />
              <h1 className={styles.title}>
                결제가 완료되었습니다.{"\n"}취업지원 신청이{"\n"}정상적으로
                접수되었습니다.
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 개인정보처리방침 모달 */}
        {showPrivacyModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowPrivacyModal(false)}
          >
            <div
              className={styles.modalPrivacy}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalPrivacyHeader}>
                <h3 className={styles.modalPrivacyTitle}>개인정보처리방침</h3>
                <button
                  className={styles.modalCloseButton}
                  onClick={() => setShowPrivacyModal(false)}
                  aria-label="닫기"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <div className={styles.modalPrivacyContent}>
                <div className={styles.modalPrivacyScroll}>
                  <p className={styles.modalPrivacyItem}>
                    <strong>1. 개인정보 수집 및 이용 목적</strong>
                    취업지원 신청 처리, 취업지원 안내, 결제 처리 및 문의사항
                    응대. 개인정보는 서비스 제공을 위한 목적으로만 수집 및
                    이용되며, 동의 없이 제3자에게 제공되지 않습니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>2. 수집 및 이용하는 개인정보 항목</strong>
                    필수 - 이름, 성별, 연락처, 생년월일, 주소, 취업 희망분야,
                    고용형태, 이력서 보유 여부
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>3. 보유 및 이용 기간</strong>
                    법령이 정하는 경우를 제외하고는 수집일로부터 1년 또는 동의
                    철회 시까지 보유 및 이용합니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>4. 동의 거부 권리</strong>
                    신청자는 동의를 거부할 권리가 있습니다. 단, 동의를 거부하는
                    경우 서비스 이용이 제한됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 이용약관 모달 */}
        {showTermsModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowTermsModal(false)}
          >
            <div
              className={styles.modalPrivacy}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalPrivacyHeader}>
                <h3 className={styles.modalPrivacyTitle}>이용약관</h3>
                <button
                  className={styles.modalCloseButton}
                  onClick={() => setShowTermsModal(false)}
                  aria-label="닫기"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <div className={styles.modalPrivacyContent}>
                <div className={styles.modalPrivacyScroll}>
                  <p className={styles.modalPrivacyItem}>
                    <strong>제1조 (목적)</strong>본 약관은 한평생교육(이하
                    &quot;회사&quot;)이 제공하는 취업지원 신청 서비스의 이용
                    조건 및 절차에 관한 사항을 규정합니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>제2조 (서비스 내용)</strong>
                    회사는 취업을 희망하는 고객에게 취업지원 서비스를
                    제공합니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>제3조 (이용자의 의무)</strong>
                    이용자는 신청 시 정확한 정보를 입력해야 하며, 허위 정보
                    입력으로 발생하는 불이익에 대해 회사는 책임지지 않습니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>제4조 (서비스 변경 및 중단)</strong>
                    회사는 운영상, 기술상의 필요에 따라 서비스를 변경하거나
                    중단할 수 있으며, 이 경우 사전에 공지합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 결제유의사항 모달 */}
        {showPaymentNoticeModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowPaymentNoticeModal(false)}
          >
            <div
              className={styles.modalPrivacy}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalPrivacyHeader}>
                <h3 className={styles.modalPrivacyTitle}>결제유의사항</h3>
                <button
                  className={styles.modalCloseButton}
                  onClick={() => setShowPaymentNoticeModal(false)}
                  aria-label="닫기"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <div className={styles.modalPrivacyContent}>
                <div className={styles.modalPrivacyScroll}>
                  <p className={styles.modalPrivacyItem}>
                    <strong>결제 안내</strong>
                    취업지원 신청 비용은 220,000원입니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>환불 규정</strong>
                    결제 후 취업지원 배정 전: 전액 환불 가능 취업지원 배정 후:
                    환불 불가
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>결제 수단</strong>
                    신용카드, 체크카드, 계좌이체 등 다양한 결제 수단을
                    지원합니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>영수증 발급</strong>
                    결제 완료 후 이메일로 영수증이 발송됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function Page() {
  const [clickSource, setClickSource] = useState("취업신청");
  const handleSourceChange = useCallback((source: string) => {
    setClickSource(source);
  }, []);

  return (
    <Suspense fallback={<div />}>
      <ClickSourceHandler onSourceChange={handleSourceChange} />
      <EmploymentFormContent clickSource={clickSource} />
    </Suspense>
  );
}
