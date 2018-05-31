import React from 'react'
import Link from 'gatsby-link'

const attributes = {
  itemProp: 'name',
}

const AuthorName = ({ name }) => (
  <span {...attributes}>
    {name}
  </span>
);


export default AuthorName
