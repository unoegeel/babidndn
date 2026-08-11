export type UserGuideImage = {
  src: string;
  alt: string;
};

export type UserGuideStep = {
  step: number;
  title: string;
  description: string;
  images: UserGuideImage[];
};

/** 바비오더 사용 가이드 10단계 (PDF 문구·public/guide 이미지 기준) */
export const USER_GUIDE_STEPS: UserGuideStep[] = [
  {
    step: 1,
    title: "카테고리 스와이프",
    description: "좌우로 스와이프해서 카테고리를 옮겨보세요!",
    images: [
      {
        src: "/guide/guide_step_1.png",
        alt: "좌우로 스와이프해서 카테고리를 옮겨보세요!",
      },
    ],
  },
  {
    step: 2,
    title: "최상단 이동",
    description: "바비든든을 누르면 최상단으로 올라가요!",
    images: [
      {
        src: "/guide/guide_step_2.png",
        alt: "바비든든을 누르면 최상단으로 올라가요!",
      },
    ],
  },
  {
    step: 3,
    title: "옵션·장바구니",
    description: "원하는 옵션을 선택 후 하단의 장바구니 담기 버튼을 눌러주세요!",
    images: [
      {
        src: "/guide/guide_step_3.png",
        alt: "원하는 옵션을 선택 후 하단의 장바구니 담기 버튼을 눌러주세요!",
      },
    ],
  },
  {
    step: 4,
    title: "토핑 가로 스크롤",
    description: "보이지 않는 토핑는 좌우로 스크롤하면 있어요!",
    images: [
      {
        src: "/guide/guide_step_4.png",
        alt: "보이지 않는 토핑는 좌우로 스크롤하면 있어요!",
      },
    ],
  },
  {
    step: 5,
    title: "결제하기 진입",
    description: "장바구니에 원하는 상품을 담은 후 결제하기 버튼을 눌러주세요!",
    images: [
      {
        src: "/guide/guide_step_5.png",
        alt: "장바구니에 원하는 상품을 담은 후 결제하기 버튼을 눌러주세요!",
      },
    ],
  },
  {
    step: 6,
    title: "주문하기",
    description: "장바구니에 담긴 상품을 확인 후 하단의 주문하기 버튼을 눌러주세요!",
    images: [
      {
        src: "/guide/guide_step_6.png",
        alt: "장바구니에 담긴 상품을 확인 후 하단의 주문하기 버튼을 눌러주세요!",
      },
    ],
  },
  {
    step: 7,
    title: "결제수단·결제",
    description: "원하는 결제수단을 선택 후 결제하기 버튼을 눌러 결제해주세요!",
    images: [
      {
        src: "/guide/guide_step_7.png",
        alt: "원하는 결제수단을 선택 후 결제하기 버튼을 눌러 결제해주세요!",
      },
    ],
  },
  {
    step: 8,
    title: "픽업",
    description: "준비가 완료되면 카운터에서 픽업해주세요!",
    images: [
      {
        src: "/guide/guide_step_8-1.png",
        alt: "준비가 완료되면 카운터에서 픽업해주세요! (주문 현황 화면)",
      },
      {
        src: "/guide/guide_step_8-2.png",
        alt: "준비가 완료되면 카운터에서 픽업해주세요! (픽업 안내)",
      },
    ], 
  },
  {
    step: 9,
    title: "대기 중 메뉴·알림",
    description:
      `음식이 준비되는 동안 바비든든의 메뉴를 구경해보세요!<br/>준비되면 알림이 뜹니다!`,
    images: [
      {
        src: "/guide/guide_step_9.png",
        alt: "음식이 준비되는 동안 바비든든의 메뉴를 구경해보세요! 준비되면 알림이 뜹니다!",
      },
    ],
  },
  {
    step: 10,
    title: "리뷰·서비스 문의",
    description:
      `사장님께 전달하고 싶으신 의견은 리뷰로,<br/>서비스 이용에 관한 의견은 서비스 문의로 말씀해주세요!`,
    images: [
      {
        src: "/guide/guide_step_10-1.png",
        alt: "사장님께 전달하고 싶으신 의견은 리뷰로! (리뷰 화면)",
      },
      {
        src: "/guide/guide_step_10-2.png",
        alt: "서비스 이용에 관한 의견은 서비스 문의로! (서비스 문의 화면)",
      },
    ],
  },
];
