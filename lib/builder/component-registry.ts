
import { ComponentSchemas } from "./schema";

export const ComponentRegistry = {
  Heading:{
    schema: ComponentSchemas.Heading,
    render:(props)=> <h1 className={props.className}>{props.text}</h1>
  },
  Paragraph:{
    schema: ComponentSchemas.Paragraph,
    render:(props)=> <p className={props.className}>{props.text}</p>
  }
};
