export type Category={id:number;name:string};
export type Menu={id:number;name:string;price:number;category:Category;description?:string;imageUrl?:string;soldOut:boolean};
export type CartItem={id:number;menu:Menu;quantity:number;optionSummary?:string;optionPrice:number;lineTotal:number};
export type OrderStatus='ORDERED'|'COOKING'|'READY';
export type OrderItem={id:number;menuId:number;menuName:string;unitPrice:number;quantity:number;optionSummary?:string;optionPrice:number;lineTotal:number};
export type Order={id:number;orderNumber:string;status:OrderStatus;totalAmount:number;createdAt:string;items:OrderItem[]};
